import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_PROMPT = `You are CodeSense, a code-explanation engine for non-experts.

You will be shown a snippet of source code (as text or extracted from an image).
You must respond by calling the "explain_code" tool with EXACTLY these fields:
- language: the programming language name (e.g. "TypeScript", "Python 3"). If you cannot tell, use "Unknown".
- functionality: an array of 3-10 short, plain-English bullet steps describing what the code does, in order. Each step is one sentence. No code, no jargon when avoidable.
- purpose: a 2-4 sentence paragraph explaining the most likely reason this code was written. Hedge when uncertain ("This appears to…", "Likely used for…").

Rules:
- Respond in English regardless of input language or comments.
- Be honest about uncertainty.
- Never refuse unless the code is clearly malicious (e.g. explicit malware).
- Always call the explain_code tool. Do not output prose outside the tool call.`;

const explainTool = {
  type: "function" as const,
  function: {
    name: "explain_code",
    description: "Return a structured explanation of a code snippet.",
    parameters: {
      type: "object",
      properties: {
        language: { type: "string" },
        functionality: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 10,
        },
        purpose: { type: "string" },
      },
      required: ["language", "functionality", "purpose"],
      additionalProperties: false,
    },
  },
};

const inputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    code: z.string().min(1).max(50_000),
  }),
  z.object({
    kind: z.literal("github"),
    code: z.string().min(1).max(120_000),
    path: z.string().min(1).max(500),
  }),
  z.object({
    kind: z.literal("image"),
    dataUrl: z.string().min(20).max(15_000_000),
  }),
]);

export type AnalyzeInput = z.infer<typeof inputSchema>;

export type AnalysisResult = {
  id: string;
  language: string;
  functionality: string[];
  purpose: string;
  input_method: "text" | "image" | "github";
  source_excerpt: string;
  source_full: string | null;
  github_path: string | null;
  created_at: string;
};

async function callGateway(messages: any[]): Promise<{ language: string; functionality: string[]; purpose: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Service temporarily unavailable. Please try again later.");

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30_000);

  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [explainTool],
        tool_choice: { type: "function", function: { name: "explain_code" } },
      }),
      signal: ctl.signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Analysis timed out. Try a shorter snippet.");
    throw new Error("Could not reach the AI. Check your connection and try again.");
  } finally {
    clearTimeout(t);
  }

  if (resp.status === 429) throw new Error("You've analyzed a lot today! Try again in a few minutes.");
  if (resp.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.error("AI gateway error:", resp.status, txt);
    throw new Error("Service temporarily unavailable. Please try again later.");
  }

  const json = await resp.json();
  const call = json?.choices?.[0]?.message?.tool_calls?.[0];
  const rawArgs = call?.function?.arguments;
  if (!rawArgs) {
    // fallback: try parsing content as JSON
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      try { return JSON.parse(content); } catch { /* fall through */ }
    }
    throw new Error("Analysis returned no results. Try rephrasing or submitting different code.");
  }
  let parsed: any;
  try { parsed = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs; }
  catch { throw new Error("Analysis returned malformed data. Please try again."); }

  if (!parsed?.language || !Array.isArray(parsed?.functionality) || !parsed?.purpose) {
    throw new Error("Analysis returned no results. Try rephrasing or submitting different code.");
  }
  return parsed;
}

export const analyzeCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<AnalysisResult> => {
    const { supabase, userId } = context;

    let messages: any[];
    let source_excerpt: string;
    let source_full: string | null;
    let github_path: string | null = null;
    let input_method: "text" | "image" | "github";

    if (data.kind === "text" || data.kind === "github") {
      input_method = data.kind;
      source_full = data.code;
      source_excerpt = data.code.slice(0, 500);
      if (data.kind === "github") github_path = data.path;
      const header = data.kind === "github" ? `File: ${data.path}\n\n` : "";
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${header}Analyze this code:\n\n\`\`\`\n${data.code}\n\`\`\`` },
      ];
    } else {
      input_method = "image";
      source_full = null;
      source_excerpt = "[Image of code]";
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze the code visible in this image." },
            { type: "image_url", image_url: { url: data.dataUrl } },
          ],
        },
      ];
    }

    const result = await callGateway(messages);

    // Atomic quota-checked insert (Postgres function holds a per-user
    // advisory lock for the duration of the transaction, so concurrent
    // calls cannot race past the 30/UTC-day limit).
    type AnalysisRow = {
      id: string;
      language: string;
      functionality: unknown;
      purpose: string;
      input_method: string;
      source_excerpt: string;
      source_full: string | null;
      github_path: string | null;
      created_at: string;
    };
    const rpcResult = await (supabase as any)
      .rpc("insert_analysis_with_quota", {
        p_input_method: input_method,
        p_source_excerpt: source_excerpt,
        p_source_full: source_full,
        p_github_path: github_path,
        p_language: result.language,
        p_functionality: result.functionality,
        p_purpose: result.purpose,
      })
      .single();
    const row: AnalysisRow | null = rpcResult.data as AnalysisRow | null;
    const error: { message?: string } | null = rpcResult.error;

    if (error || !row) {
      const msg = error?.message ?? "";
      if (msg.includes("QUOTA_EXCEEDED")) {
        throw new Error("Daily quota reached (30/30). Resets at 00:00 UTC.");
      }
      if (msg.includes("NOT_AUTHENTICATED")) {
        throw new Error("Your session expired. Please sign in again.");
      }
      console.error("DB insert error:", error);
      throw new Error("Could not save analysis. Please try again.");
    }
    // userId is captured from the verified JWT and matches v_user inside the
    // RPC, so the returned row always belongs to the caller.
    void userId;

    return {
      id: row.id,
      language: row.language,
      functionality: row.functionality as string[],
      purpose: row.purpose,
      input_method: row.input_method as any,
      source_excerpt: row.source_excerpt,
      source_full: row.source_full,
      github_path: row.github_path,
      created_at: row.created_at,
    };
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnalysisResult[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      language: r.language,
      functionality: r.functionality as string[],
      purpose: r.purpose,
      input_method: r.input_method as any,
      source_excerpt: r.source_excerpt,
      source_full: r.source_full,
      github_path: r.github_path,
      created_at: r.created_at,
    }));
  });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("analyses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ used: number; limit: number; remaining: number; resetsAt: string }> => {
    const { supabase } = context;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const resetsAt = new Date(startOfDay);
    resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
    const { count, error } = await supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString());
    if (error) throw new Error(error.message);
    const limit = 30;
    const used = count ?? 0;
    return { used, limit, remaining: Math.max(0, limit - used), resetsAt: resetsAt.toISOString() };
  });
