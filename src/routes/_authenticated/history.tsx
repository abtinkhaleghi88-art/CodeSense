import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Trash2, Search, FileCode, Camera, Github, Inbox } from "lucide-react";
import { listAnalyses, deleteAnalysis, type AnalysisResult } from "@/lib/analyses.functions";
import { AnalysisPanel } from "@/components/codesense/analysis-panel";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

const methodIcon = (m: string) =>
  m === "image" ? <Camera className="size-3.5" /> :
  m === "github" ? <Github className="size-3.5" /> :
  <FileCode className="size-3.5" />;

function HistoryPage() {
  const listFn = useServerFn(listAnalyses);
  const delFn = useServerFn(deleteAnalysis);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AnalysisResult | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => listFn(),
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) =>
      i.language.toLowerCase().includes(t) ||
      i.source_excerpt.toLowerCase().includes(t) ||
      i.purpose.toLowerCase().includes(t)
    );
  }, [items, q]);

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["analyses"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-pixel text-lg text-primary">{">"} history</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">{items.length} saved · most recent 100</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by language or keyword" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="font-mono text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="font-mono text-sm text-muted-foreground">
            {items.length === 0 ? "No analyses yet — go run one!" : "No matches for your search."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <li key={it.id}>
              <Card
                onClick={() => setSelected(it)}
                className="group flex cursor-pointer items-center gap-3 p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {methodIcon(it.input_method)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">{it.language}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {it.source_excerpt.replace(/\s+/g, " ").slice(0, 120)}
                  </p>
                </div>
                <Button
                  size="icon" variant="ghost"
                  onClick={(e) => { e.stopPropagation(); del.mutate(it.id); }}
                  aria-label="Delete"
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AnalysisPanel result={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}
