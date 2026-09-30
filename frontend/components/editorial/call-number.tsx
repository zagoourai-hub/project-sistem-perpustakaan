import { cn } from "@/lib/cn";
import type { CallNumberProps } from "@/shared/props/components";

/** Nomor panggil chip — mono, hairline border, 2px radius. On every book row. */
export function CallNumber({ value, className }: CallNumberProps) {
  return (
    <span
      className={cn(
        "data inline-block shrink-0 rounded-xs border border-outline-variant bg-surface-container-low px-2 py-0.5 text-[11px] whitespace-nowrap text-on-surface",
        className,
      )}
    >
      {value}
    </span>
  );
}
