import { cn } from "@/lib/utils";

export function ScannerOverlay({ active, direction = "vertical", className }: {
  active: boolean;
  direction?: "vertical" | "horizontal";
  className?: string;
}) {
  if (!active) return null;
  const isV = direction === "vertical";
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]", className)}>
      <div className="scanner-tint" />
      <div
        className={cn(
          "scanner-beam",
          isV ? "animate-scan" : "animate-scan-horizontal",
        )}
        style={
          isV
            ? { top: 0 }
            : { top: 0, bottom: 0, height: "100%", width: "3px", insetInline: "auto", left: 0, background: "linear-gradient(180deg, transparent, color-mix(in oklab, var(--primary) 70%, transparent), transparent)" }
        }
      />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-xs text-primary animate-pulse-glow">
        Analyzing<span className="animate-blink">_</span>
      </div>
    </div>
  );
}
