"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { CallNumber } from "@/components/editorial/call-number";
import { daysUntil, formatDate, formatRupiah } from "@/lib/format";
import type { DueSlipProps, DueState } from "@/shared/props/components";

export function dueStateOf(dueAt: string, now = new Date()): DueState {
  const days = daysUntil(dueAt, now);
  if (days < 0) return "overdue";
  return days <= 2 ? "soon" : "normal";
}

const STAMP: Record<DueState, string> = {
  normal: "border-on-surface text-on-surface",
  soon: "border-on-tertiary-container text-tertiary-container dark:text-on-tertiary-container",
  overdue: "border-primary text-primary",
};

/** Active loan as a date-due slip (07-portal-anggota): mono dates + a −2° stamp. */
export function DueSlip({ loan, state, onRenew, renewDisabledReason, isRenewing, className }: DueSlipProps) {
  const due = state ?? dueStateOf(loan.dueAt);
  const days = daysUntil(loan.dueAt);
  const book = loan.item.book;
  const blocked = due === "overdue" ? "Tidak bisa diperpanjang saat terlambat" : renewDisabledReason;

  return (
    <article className={cn("flex flex-col rounded-xs border border-outline-variant bg-surface-container-lowest p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-book-title text-on-surface">{book.title}</h3>
          <p className="text-body-sm text-on-surface-variant">{book.authors.map((a) => a.name).join(", ")}</p>
        </div>
        <CallNumber value={book.callNumber} />
      </div>

      <div className="my-3.5 h-px w-full bg-outline-variant/60" aria-hidden />

      <div className="flex items-center justify-between gap-3">
        <div className="data flex flex-col gap-1 text-[13px]">
          <span className="text-on-surface-variant">Dipinjam {formatDate(loan.checkedOutAt)}</span>
          <span className={cn(due === "overdue" ? "text-primary" : due === "soon" ? "text-tertiary-container dark:text-on-tertiary-container" : "text-on-surface")}>
            {due === "overdue"
              ? `Terlambat ${-days} hari${loan.accruedFine ? ` · ${formatRupiah(loan.accruedFine)}` : ""}`
              : days === 0
                ? "Jatuh tempo hari ini"
                : `${days} hari lagi`}
          </span>
        </div>
        <div className={cn("shrink-0 -rotate-2 rounded-xs border px-2.5 py-1 text-center", STAMP[due])}>
          <span className="data block text-[9px] leading-none font-medium tracking-wider uppercase">Jatuh tempo</span>
          <span className="data mt-0.5 block text-[13px] leading-none font-semibold uppercase">{formatDate(loan.dueAt)}</span>
        </div>
      </div>

      {onRenew ? (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-outline-variant/40 pt-3">
          <Button
            variant="secondary"
            className="w-full"
            disabled={Boolean(blocked) || loan.renewCount >= loan.maxRenewals}
            loading={isRenewing}
            onClick={() => onRenew(loan.id)}
          >
            Perpanjang
          </Button>
          {blocked ? <p className="data text-center text-[11px] text-on-surface-variant">{blocked}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
