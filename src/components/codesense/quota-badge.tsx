import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getQuota } from "@/lib/analyses.functions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BAR_CELLS = 12;

export function QuotaBadge() {
  const getQuotaFn = useServerFn(getQuota);
  const { data } = useQuery({
    queryKey: ["quota"],
    queryFn: () => getQuotaFn(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const limit = data?.limit ?? 30;
  const remaining = data?.remaining ?? limit;
  const used = data?.used ?? 0;
  const filled = Math.round((remaining / limit) * BAR_CELLS);

  const exhausted = remaining === 0;
  const low = !exhausted && remaining <= 5;

  const tone = exhausted
    ? "text-destructive border-destructive/60 shadow-[0_0_8px_hsl(var(--destructive)/0.5)]"
    : low
      ? "text-amber-400 border-amber-400/50 shadow-[0_0_8px_hsl(43_96%_56%/0.4)]"
      : "text-primary border-primary/40 shadow-[0_0_8px_hsl(var(--primary)/0.4)]";

  const cellOn = exhausted ? "bg-destructive" : low ? "bg-amber-400" : "bg-primary";
  const cellOff = exhausted ? "bg-destructive/15" : low ? "bg-amber-400/15" : "bg-primary/15";

  const label = exhausted ? "EXHAUSTED" : `${remaining}/${limit}`;
  const resetText = data?.resetsAt
    ? `Resets at 00:00 UTC (${new Date(data.resetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} local)`
    : "Resets at 00:00 UTC";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "hidden sm:flex items-center gap-2 rounded-md border bg-background/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
              tone,
            )}
            aria-label={`Quota ${used} of ${limit} used`}
          >
            <span className="opacity-80">QUOTA</span>
            <span className="flex items-center gap-[2px]" aria-hidden>
              {Array.from({ length: BAR_CELLS }).map((_, i) => (
                <span
                  key={i}
                  className={cn("h-3 w-[3px] rounded-[1px]", i < filled ? cellOn : cellOff)}
                />
              ))}
            </span>
            <span className="tabular-nums">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-mono text-xs">
          {resetText}
        </TooltipContent>
      </Tooltip>

      {/* Mobile compact chip */}
      <div
        className={cn(
          "flex sm:hidden items-center rounded-md border bg-background/60 px-2 py-1 font-mono text-[10px] uppercase tabular-nums",
          tone,
        )}
        aria-label={`Quota ${used} of ${limit} used`}
      >
        {exhausted ? "0/" + limit : `${remaining}/${limit}`}
      </div>
    </TooltipProvider>
  );
}