import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TreeEntry = { path: string; type: "blob" | "tree"; size?: number };
export type RepoInfo = { owner: string; repo: string; branch: string; entries: TreeEntry[] };

const repoSchema = z.object({
  owner: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/),
  repo: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/),
  branch: z.string().min(1).max(200).optional(),
});

const fileSchema = z.object({
  owner: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/),
  repo: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/),
  branch: z.string().min(1).max(200),
  path: z.string().min(1).max(500),
});

const MAX_FILE = 100 * 1024;

function ghHeaders() {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CodeSense",
  };
  const tok = process.env.GITHUB_TOKEN;
  if (tok) h.Authorization = `Bearer ${tok}`;
  return h;
}

export const fetchGithubTree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => repoSchema.parse(input))
  .handler(async ({ data }): Promise<RepoInfo> => {
    const branches = data.branch ? [data.branch] : ["main", "master"];
    for (const b of branches) {
      const r = await fetch(
        `https://api.github.com/repos/${data.owner}/${data.repo}/git/trees/${encodeURIComponent(b)}?recursive=1`,
        { headers: ghHeaders() },
      );
      if (r.status === 404) continue;
      if (r.status === 403 || r.status === 429) {
        throw new Error("GitHub rate limit hit. Try again in a few minutes.");
      }
      if (!r.ok) throw new Error("Could not load repository.");
      const j = (await r.json()) as { tree?: TreeEntry[] };
      return { owner: data.owner, repo: data.repo, branch: b, entries: j.tree ?? [] };
    }
    throw new Error("Repository or branch not found.");
  });

export const fetchGithubFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => fileSchema.parse(input))
  .handler(async ({ data }): Promise<{ content: string; size: number }> => {
    const r = await fetch(
      `https://api.github.com/repos/${data.owner}/${data.repo}/contents/${data.path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(data.branch)}`,
      { headers: ghHeaders() },
    );
    if (r.status === 403 || r.status === 429) {
      throw new Error("GitHub rate limit hit. Try again in a few minutes.");
    }
    if (!r.ok) throw new Error("Could not load file.");
    const j = (await r.json()) as { size?: number; encoding?: string; content?: string };
    const size = j.size ?? 0;
    if (size > MAX_FILE) {
      throw new Error(`File too large (${(size / 1024).toFixed(0)} KB). Maximum 100 KB.`);
    }
    const raw = j.content ?? "";
    const decoded = j.encoding === "base64"
      ? Buffer.from(raw.replace(/\n/g, ""), "base64").toString("utf-8")
      : raw;
    return { content: decoded, size };
  });