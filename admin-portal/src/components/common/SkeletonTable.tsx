import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-fps-border/60", className)} />
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 5 }: SkeletonTableProps) {
  return (
    <div className="rounded-xl border border-fps-border overflow-hidden bg-white">
      <div className="border-b border-fps-border bg-fps-canvas px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-fps-divider last:border-0 px-4 py-3.5 flex gap-4 items-center">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <Skeleton
              key={j}
              className={cn("h-3.5", j === 0 ? "w-32" : j === 1 ? "w-20" : "w-16")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-fps-border bg-white p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}
