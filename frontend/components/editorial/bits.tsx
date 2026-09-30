import { cn } from "@/lib/cn";
import type { KbdProps, StatProps } from "@/shared/props/components";
import type { ClassNameProps } from "@/shared/props/common";

/** Keyboard hint chip ("F2", "Esc", "/"). Never wraps (mockup bug "F / 2"). */
export function Kbd({ keys, className }: KbdProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
      {keys.map((k) => (
        <kbd
          key={k}
          className="data inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-current/30 px-1 text-[10px] leading-none opacity-80"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

/** Big mono number (data-lg) + caps label — dashboards, member panel. No stat cards. */
export function Stat({ label, value, hint, tone = "default", className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className={cn("data text-data-lg", tone === "accent" ? "text-primary-container dark:text-primary" : "text-on-surface")}>
        {value}
      </span>
      <span className="text-xs font-semibold tracking-[0.08em] text-on-surface uppercase">{label}</span>
      {hint ? <span className="data text-[11px] text-on-surface-variant">{hint}</span> : null}
    </div>
  );
}

export function Skeleton({ className }: ClassNameProps) {
  return <div className={cn("animate-pulse rounded-xs bg-surface-container-high", className)} aria-hidden />;
}

/** Book list rows placeholder (cover + three lines). */
export function BookRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-outline-variant" role="status" aria-label="Memuat">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 py-5">
          <Skeleton className="aspect-[2/3] w-16" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col" role="status" aria-label="Memuat">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-14 items-center gap-6 border-b border-outline-variant px-3">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
