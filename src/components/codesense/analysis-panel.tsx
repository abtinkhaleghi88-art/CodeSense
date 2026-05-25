import { useState } from "react";
import { X, Copy, Languages, Cog, Lightbulb, Code2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AnalysisResult } from "@/lib/analyses.functions";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AnalysisPanel({
  result, open, onClose,
}: {
  result: AnalysisResult | null;
  open: boolean;
  onClose: () => void;
}) {
  const [showCode, setShowCode] = useState(false);

  const copyAll = async () => {
    if (!result) return;
    const text =
`Language: ${result.language}

How It Works:
${result.functionality.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Why It Was Written:
${result.purpose}`;
    await navigator.clipboard.writeText(text);
    toast.success("Analysis copied to clipboard");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[40vw] sm:min-w-[420px] flex flex-col gap-0 p-0 border-l border-primary/30 bg-card animate-slide-in-right"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 text-primary">
            <Code2 className="size-4" />
            <span className="font-pixel text-xs">ANALYSIS</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
            <X className="size-4" />
          </Button>
        </div>

        {!result ? null : (
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section>
              <header className="flex items-center gap-2 mb-3 text-muted-foreground">
                <Languages className="size-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-wide uppercase">Language</h3>
              </header>
              <Badge variant="secondary" className="text-base font-mono px-3 py-1 border-primary/30 bg-primary/10 text-primary">
                {result.language}
              </Badge>
            </section>

            <section>
              <header className="flex items-center gap-2 mb-3 text-muted-foreground">
                <Cog className="size-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-wide uppercase">How It Works</h3>
              </header>
              <ol className="space-y-2.5">
                {result.functionality.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 font-mono text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <header className="flex items-center gap-2 mb-3 text-muted-foreground">
                <Lightbulb className="size-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-wide uppercase">Why It Was Written</h3>
              </header>
              <p className="text-sm leading-relaxed text-foreground/90">{result.purpose}</p>
            </section>

            {result.source_full && (
              <Collapsible open={showCode} onOpenChange={setShowCode}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="font-mono text-xs">
                    <ChevronDown className={`mr-1 size-3 transition-transform ${showCode ? "rotate-180" : ""}`} />
                    {showCode ? "Hide" : "Show"} original code
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  {result.github_path && (
                    <div className="mb-1 font-mono text-xs text-muted-foreground">{result.github_path}</div>
                  )}
                  <pre className="max-h-[40vh] overflow-auto rounded-md border border-border bg-terminal p-3 text-[12px] leading-relaxed text-terminal-foreground">
                    <code>{result.source_full}</code>
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={copyAll}>
                <Copy className="mr-2 size-3.5" /> Copy analysis
              </Button>
              <Button size="sm" variant="ghost" className="text-primary" disabled>
                <Check className="mr-2 size-3.5" /> Saved to history
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
