import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScannerOverlay } from "./scanner";
import { Trash2, Sparkles } from "lucide-react";

const MAX = 50_000;

export function RawCodeTab({
  loading,
  onAnalyze,
}: {
  loading: boolean;
  onAnalyze: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const count = code.length;
  const warn = count >= MAX * 0.8;

  const lines = code.split("\n");

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border border-border bg-terminal">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive/70" />
            <span className="size-2.5 rounded-full bg-yellow-500/70" />
            <span className="size-2.5 rounded-full bg-primary/70" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">paste.code</span>
          </div>
          <span className={`font-mono text-xs ${warn ? "text-destructive" : "text-muted-foreground"}`}>
            {count.toLocaleString()} / {MAX.toLocaleString()}
          </span>
        </div>
        <div className="relative flex min-h-[320px]">
          <div className="select-none border-r border-border/40 bg-background/30 px-3 py-3 text-right font-mono text-xs text-muted-foreground/70">
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, MAX))}
            placeholder="// Paste your code here..."
            spellCheck={false}
            className="min-h-[320px] flex-1 resize-y rounded-none border-0 bg-transparent font-mono text-[13px] leading-6 text-terminal-foreground focus-visible:ring-0"
          />
          <ScannerOverlay active={loading} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => setCode("")} disabled={!code || loading}>
          <Trash2 className="mr-2 size-4" /> Clear
        </Button>
        <Button onClick={() => onAnalyze(code)} disabled={!code.trim() || loading} className="font-mono">
          <Sparkles className="mr-2 size-4" /> {loading ? "Analyzing…" : "Analyze"}
        </Button>
      </div>
    </div>
  );
}
