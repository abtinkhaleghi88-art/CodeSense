import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileCode, Camera, Github } from "lucide-react";
import { RawCodeTab } from "@/components/codesense/raw-code-tab";
import { PhotoTab } from "@/components/codesense/photo-tab";
import { GitHubTab } from "@/components/codesense/github-tab";
import { AnalysisPanel } from "@/components/codesense/analysis-panel";
import { analyzeCode, type AnalysisResult, type AnalyzeInput } from "@/lib/analyses.functions";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppPage,
});

function AppPage() {
  const analyzeFn = useServerFn(analyzeCode);
  const qc = useQueryClient();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (!sessionStorage.getItem("codesense.welcomed")) {
      setShowWelcome(true);
      sessionStorage.setItem("codesense.welcomed", "1");
      fadeTimerRef.current = setTimeout(() => setFadingOut(true), 3600);
      unmountTimerRef.current = setTimeout(() => {
        setShowWelcome(false);
        setFadingOut(false);
      }, 4000);
      return () => {
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
      };
    }
  }, []);

  const mutation = useMutation({
    mutationFn: (input: AnalyzeInput) => analyzeFn({ data: input }),
    onSuccess: (r) => {
      setResult(r);
      setOpen(true);
      qc.invalidateQueries({ queryKey: ["analyses"] });
      qc.invalidateQueries({ queryKey: ["quota"] });
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Analysis failed");
      if (typeof e?.message === "string" && e.message.startsWith("Daily quota")) {
        qc.invalidateQueries({ queryKey: ["quota"] });
      }
    },
  });

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-8">
      {showWelcome && (
        <div
          className={
            "fixed inset-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur pointer-events-none transition-opacity duration-[400ms] " +
            (fadingOut ? "opacity-0" : "opacity-100")
          }
        >
          <div className="text-center">
            <div className="font-pixel text-3xl text-primary animate-pulse-glow">Welcome to CodeSense</div>
            <p className="mt-3 font-mono text-sm text-muted-foreground">Where you know what you code.</p>
            <div className="relative mt-6 h-[3px] w-64 mx-auto overflow-hidden rounded-sm bg-primary/15">
              <div
                className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_hsl(var(--primary)/0.8)] animate-scan-horizontal"
                style={{ animationDuration: "4s", animationIterationCount: 1 }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-pixel text-lg text-primary">{">"} new analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground font-mono">
          Submit code by paste, photo, or GitHub link. We'll explain what it does.
        </p>
      </div>

      <Tabs defaultValue="raw" className="w-full">
        <TabsList className="grid w-full grid-cols-3 font-mono">
          <TabsTrigger value="raw"><FileCode className="mr-2 size-4" /> RAW CODE</TabsTrigger>
          <TabsTrigger value="photo"><Camera className="mr-2 size-4" /> PHOTO</TabsTrigger>
          <TabsTrigger value="github"><Github className="mr-2 size-4" /> GITHUB</TabsTrigger>
        </TabsList>
        <TabsContent value="raw" className="mt-6">
          <RawCodeTab
            loading={mutation.isPending}
            onAnalyze={(code) => mutation.mutate({ kind: "text", code })}
          />
        </TabsContent>
        <TabsContent value="photo" className="mt-6">
          <PhotoTab
            loading={mutation.isPending}
            onAnalyze={(dataUrl) => mutation.mutate({ kind: "image", dataUrl })}
          />
        </TabsContent>
        <TabsContent value="github" className="mt-6">
          <GitHubTab
            loading={mutation.isPending}
            onAnalyze={(code, path) => mutation.mutate({ kind: "github", code, path })}
          />
        </TabsContent>
      </Tabs>

      <AnalysisPanel result={result} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
