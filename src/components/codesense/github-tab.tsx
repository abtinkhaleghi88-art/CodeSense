import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScannerOverlay } from "./scanner";
import { Folder, FolderOpen, File as FileIcon, Sparkles, Github, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { fetchGithubTree, fetchGithubFile, type TreeEntry, type RepoInfo } from "@/lib/github.functions";

// types re-exported from github.functions
type _T = TreeEntry;

const COLOR_BY_EXT: Record<string, string> = {
  js: "text-yellow-400", jsx: "text-yellow-400", mjs: "text-yellow-400",
  ts: "text-sky-400", tsx: "text-sky-400",
  py: "text-blue-400",
  rb: "text-red-400",
  go: "text-cyan-400",
  rs: "text-orange-400",
  java: "text-orange-300",
  kt: "text-purple-400",
  swift: "text-orange-400",
  html: "text-orange-500", css: "text-blue-300", scss: "text-pink-400",
  json: "text-yellow-300", md: "text-muted-foreground", sh: "text-emerald-400",
  c: "text-blue-300", cpp: "text-blue-300", h: "text-blue-300",
};

function extColor(p: string) {
  const e = p.split(".").pop()?.toLowerCase() ?? "";
  return COLOR_BY_EXT[e] ?? "text-muted-foreground";
}

function parseUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\/|\/$/g, "").split("/");
    if (parts.length < 2) return null;
    const [owner, repoRaw, maybeTree, ...rest] = parts;
    const repo = repoRaw.replace(/\.git$/, "");
    const branch = maybeTree === "tree" && rest[0] ? rest[0] : undefined;
    return { owner, repo, branch };
  } catch { return null; }
}

type NodeT = { name: string; path: string; children: NodeT[]; isFile: boolean };

function buildTree(entries: TreeEntry[]): NodeT {
  const root: NodeT = { name: "", path: "", children: [], isFile: false };
  for (const e of entries) {
    const parts = e.path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join("/");
      const isLast = i === parts.length - 1;
      let child = cur.children.find((c) => c.name === name);
      if (!child) {
        child = { name, path, children: [], isFile: isLast && e.type === "blob" };
        cur.children.push(child);
      }
      cur = child;
    }
  }
  const sort = (n: NodeT) => {
    n.children.sort((a, b) => (Number(a.isFile) - Number(b.isFile)) || a.name.localeCompare(b.name));
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

function TreeNode({ node, depth, expanded, toggle, onPick, selected }: {
  node: NodeT; depth: number;
  expanded: Set<string>; toggle: (p: string) => void;
  onPick: (path: string) => void; selected: string | null;
}) {
  return (
    <ul className="font-mono text-[13px]">
      {node.children.map((c) => {
        const isOpen = expanded.has(c.path);
        const isSel = selected === c.path;
        return (
          <li key={c.path}>
            <button
              onClick={() => (c.isFile ? onPick(c.path) : toggle(c.path))}
              className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left hover:bg-accent/50 ${isSel ? "bg-primary/15 text-primary" : ""}`}
              style={{ paddingLeft: depth * 14 + 6 }}
            >
              {c.isFile ? (
                <FileIcon className={`size-3.5 ${extColor(c.name)}`} />
              ) : isOpen ? (
                <FolderOpen className="size-3.5 text-primary" />
              ) : (
                <Folder className="size-3.5 text-primary/70" />
              )}
              <span className="truncate">{c.name}</span>
            </button>
            {!c.isFile && isOpen && (
              <TreeNode node={c} depth={depth + 1} expanded={expanded} toggle={toggle} onPick={onPick} selected={selected} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function GitHubTab({ loading, onAnalyze }: {
  loading: boolean;
  onAnalyze: (code: string, path: string) => void;
}) {
  const treeFn = useServerFn(fetchGithubTree);
  const fileFn = useServerFn(fetchGithubFile);
  const [url, setUrl] = useState("");
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const loadRepo = async () => {
    const parsed = parseUrl(url);
    if (!parsed) { toast.error("Enter a valid GitHub URL"); return; }
    setLoadingRepo(true); setRepo(null); setSelected(null); setFileContent("");
    try {
      const info = await treeFn({ data: parsed });
      setRepo(info);
    } catch (e: any) {
      toast.error(e.message ?? "Could not load repository");
    } finally {
      setLoadingRepo(false);
    }
  };

  const pickFile = async (path: string) => {
    if (!repo) return;
    setSelected(path); setFileContent(""); setFileError(null); setFileLoading(true);
    try {
      const { content } = await fileFn({
        data: { owner: repo.owner, repo: repo.repo, branch: repo.branch, path },
      });
      setFileContent(content);
    } catch (e: any) {
      setFileError(e.message ?? "Could not load file");
    } finally {
      setFileLoading(false);
    }
  };

  const tree = repo ? buildTree(repo.entries) : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Github className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
            className="pl-9 font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && loadRepo()}
          />
        </div>
        <Button onClick={loadRepo} disabled={loadingRepo || !url.trim()}>
          {loadingRepo ? "Loading…" : "Load repository"}
        </Button>
      </div>

      {repo && tree && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="max-h-[480px] overflow-auto rounded-lg border border-border bg-card p-2">
            <div className="mb-2 px-1.5 font-mono text-xs text-muted-foreground">
              {repo.owner}/{repo.repo} · {repo.branch}
            </div>
            <TreeNode
              node={tree} depth={0}
              expanded={expanded}
              toggle={(p) => setExpanded((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; })}
              onPick={pickFile} selected={selected}
            />
          </div>

          <div className="relative overflow-hidden rounded-lg border border-border bg-terminal">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <span className="font-mono text-xs text-muted-foreground truncate">
                {selected ?? "Select a file to preview"}
              </span>
            </div>
            <div className="relative min-h-[400px]">
              {fileLoading && <div className="p-4 font-mono text-sm text-muted-foreground">Loading file…</div>}
              {fileError && (
                <div className="m-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" /> {fileError}
                </div>
              )}
              {!fileLoading && !fileError && fileContent && (
                <pre className="max-h-[400px] overflow-auto p-3 font-mono text-[12px] leading-relaxed text-terminal-foreground">
                  <code>{fileContent}</code>
                </pre>
              )}
              <ScannerOverlay active={loading} />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => fileContent && selected && onAnalyze(fileContent, selected)}
          disabled={!fileContent || loading} className="font-mono"
        >
          <Sparkles className="mr-2 size-4" /> {loading ? "Analyzing…" : "Analyze this file"}
        </Button>
      </div>
    </div>
  );
}
