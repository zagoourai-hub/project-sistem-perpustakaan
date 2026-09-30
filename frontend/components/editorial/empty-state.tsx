import { cn } from "@/lib/cn";
import type { EmptyStateProps } from "@/shared/props/components";

/** One Anton sentence + one action. No illustrations (DESIGN.md). */
export function EmptyState({ kicker, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded border border-outline-variant bg-surface-container-lowest px-6 py-12 text-center",
        className,
      )}
    >
      {kicker ? <span className="kicker text-on-surface-variant">{kicker}</span> : null}
      <p className="font-display text-h2 text-on-surface">{title}</p>
      {description ? <p className="max-w-md text-body-sm text-on-surface-variant">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
