import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Terminal } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password.length < 8 || !/\d/.test(password)) {
          throw new Error("Password must be at least 8 characters and contain a number.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to CodeSense.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Incorrect email or password");
      }
      navigate({ to: "/app", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 scanner-tint opacity-50" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Terminal className="size-6" />
              <span className="font-pixel text-xl">CodeSense</span>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Where you know what you code.
            </p>
          </Link>

          <Card className="border-primary/20 bg-card/80 backdrop-blur p-6 shadow-[0_0_60px_-15px_color-mix(in_oklab,var(--primary)_50%,transparent)]">
            <Tabs value={mode} onValueChange={(v) => setMode(v === "signup" ? "signup" : "signin")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <TabsContent value="signup" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" required={mode === "signup"} value={name}
                      onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
                  </div>
                </TabsContent>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Min 8 chars, includes a number" : "••••••••"} />
                </div>

                <Button type="submit" disabled={loading} className="w-full font-mono">
                  {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </Tabs>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground font-mono">
            By continuing you agree CodeSense may send code you submit to its AI provider for analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
