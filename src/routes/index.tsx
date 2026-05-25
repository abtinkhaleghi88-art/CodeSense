import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Booting CodeSense…");
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setMsg(data.session ? "Opening workspace…" : "Redirecting to sign in…");
      navigate({ to: data.session ? "/app" : "/auth", replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="font-pixel text-2xl text-primary animate-pulse-glow">CodeSense</div>
        <p className="mt-3 text-sm text-muted-foreground font-mono">{msg}</p>
      </div>
    </div>
  );
}
