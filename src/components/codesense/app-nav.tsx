import { Link, useNavigate } from "@tanstack/react-router";
import { Terminal, Sun, Moon, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { QuotaBadge } from "./quota-badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function AppNav({ email }: { email: string }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/app" className="flex items-center gap-2 text-primary">
          <Terminal className="size-5" />
          <span className="font-pixel text-sm">CodeSense</span>
        </Link>
        <div className="flex items-center gap-1">
          <QuotaBadge />
          <Button asChild variant="ghost" size="sm" className="font-mono">
            <Link to="/history">
              <History className="size-4" />
              <span className="hidden sm:inline">History</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                <span className="font-mono text-sm font-semibold">{initial}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-mono text-xs text-muted-foreground truncate">{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                <LogOut className="mr-2 size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
