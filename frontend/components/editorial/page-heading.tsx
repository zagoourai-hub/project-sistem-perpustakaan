import { cn } from "@/lib/cn";
import type { PageHeadingProps } from "@/shared/props/components";

/** Kicker → Anton title → actions right → one 2px ink rule (the page's publication header). */
export function PageHeading({ kicker, title, actions, className }: PageHeadingProps) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 border-b-2 border-on-surface pb-4", className)}>
      <div className="flex flex-col gap-1.5">
        <span className="kicker text-on-surface-variant">{kicker}</span>
        <h1 className="font-display text-h1 text-on-surface uppercase md:text-[3rem]">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Section title inside a page: kicker + Anton h2 with a hairline below. */
export function SectionHeading({ kicker, title, actions, className }: PageHeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-outline-variant pb-2", className)}>
      <div className="flex flex-col gap-1">
        <span className="kicker text-on-surface-variant">{kicker}</span>
        <h2 className="font-display text-h2 text-on-surface uppercase">{title}</h2>
      </div>
      {actions}
    </div>
  );
}
