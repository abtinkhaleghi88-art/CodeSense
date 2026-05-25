import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/codesense/app-nav";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) navigate({ to: "/auth", replace: true });
  }, [session, navigate]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-pixel text-primary animate-pulse-glow">CodeSense</div>
      </div>
    );
  }
  if (session === null) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav email={session.user.email ?? ""} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
