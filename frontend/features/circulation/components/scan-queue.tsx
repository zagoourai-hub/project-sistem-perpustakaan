"use client";

import { cn } from "@/lib/cn";
import { CircleAlert, CircleCheck, LoaderCircle, QrCode, X } from "lucide-react";
import { Kbd } from "@/components/editorial/bits";
import { BookCover } from "@/components/editorial/book-cover";
import { CallNumber } from "@/components/editorial/call-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Receipt } from "./receipt";
import type { CheckoutResult } from "@/shared/types/models";
import type { QueueRow } from "@/stores/circulation.store";

interface ScanQueueProps {
  rows: QueueRow[];
  loanDays: number | null;
  lastCheckout: CheckoutResult | null;
  memberName?: string;
  memberCode?: string | null;
  isSubmitting: boolean;
  onRemove: (barcode: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Right column of 05-sirkulasi-pinjam: scanned copies, per-row verdict, confirm. */
export function ScanQueue({ rows, loanDays, lastCheckout, memberName, memberCode, isSubmitting, onRemove, onConfirm, onCancel }: ScanQueueProps) {
  const ready = rows.filter((r) => r.state === "ok").length;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4 border-b border-on-surface pb-3">
        <div className="flex flex-col">
          <span className="data mb-0.5 text-[10px] font-semibold tracking-[0.16em] text-primary-container uppercase dark:text-primary">
            Akan dipinjam
          </span>
          <h2 className="font-display text-2xl leading-none text-on-surface uppercase">Antrean scan ({rows.length})</h2>
        </div>
        {loanDays ? <span className="data text-xs text-on-surface-variant">Peminjaman baru · Periode {loanDays} hari</span> : null}
      </div>

      {lastCheckout?.loans.length ? (
        <div role="status" className="flex flex-col gap-2 rounded-xs border-l-[3px] border-secondary bg-surface-container-lowest p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <CircleCheck className="size-4 stroke-[1.5] text-secondary" aria-hidden />
            {lastCheckout.loans.length} buku berhasil dipinjam
          </p>
          <ul className="data flex flex-col gap-1 text-[12px] text-on-surface-variant">
            {lastCheckout.loans.map((l) => (
              <li key={l.id}>
                {l.item.barcode} · {l.item.book.title} · kembali {formatDate(l.dueAt)}
              </li>
            ))}
          </ul>
          <Receipt result={lastCheckout} memberName={memberName} memberCode={memberCode} />
        </div>
      ) : null}

      {rows.length === 0 && !lastCheckout ? (
        <p className="py-10 text-center text-body-sm text-on-surface-variant">
          Scan kartu anggota, lalu scan barcode eksemplar satu per satu.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-outline-variant">
          {rows.map((row) => (
            <QueueItem key={row.barcode} row={row} onRemove={onRemove} />
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-end gap-3 rounded border border-outline-variant bg-surface-container-lowest p-4">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Batal <Kbd keys={["Esc"]} />
        </Button>
        <Button onClick={onConfirm} disabled={ready === 0} loading={isSubmitting}>
          {!isSubmitting ? <CircleCheck aria-hidden /> : null}
          Konfirmasi pinjam{ready ? ` (${ready})` : ""} <Kbd keys={["Enter"]} />
        </Button>
      </div>
    </div>
  );
}

function QueueItem({ row, onRemove }: { row: QueueRow; onRemove: (barcode: string) => void }) {
  const item = "item" in row ? row.item : undefined;
  const rejected = row.state === "rejected";

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-4 py-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1",
        rejected && "-mx-4 border-l-2 border-primary-container bg-surface-container-lowest px-4",
      )}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        {item ? (
          <BookCover title={item.book.title} coverUrl={item.book.coverUrl} width={44} />
        ) : (
          <div className="flex h-[66px] w-11 shrink-0 items-center justify-center rounded-xs border border-outline-variant bg-surface-container-high">
            {row.state === "checking" ? <LoaderCircle className="size-4 animate-spin text-outline" aria-hidden /> : <QrCode className="size-4 text-outline" aria-hidden />}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-book-title text-on-surface", rejected && "text-on-surface-variant line-through")}>
              {item?.book.title ?? (row.state === "checking" ? "Memeriksa…" : "Barcode tidak dikenal")}
            </span>
            {item ? <CallNumber value={item.book.callNumber} /> : null}
          </div>
          {item ? (
            <span className="truncate text-body-sm text-on-surface-variant">{item.book.authors.map((a) => a.name).join(", ")}</span>
          ) : null}
          {rejected ? (
            <span className="flex items-center gap-1.5 text-body-sm font-semibold text-primary-container dark:text-primary">
              <CircleAlert className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
              Ditolak: {row.reasons.join(" · ")}
            </span>
          ) : (
            <span className="data text-[12px] text-on-surface-variant">{row.barcode}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {row.state === "ok" ? (
          <div className="flex flex-col items-end gap-1">
            <Badge variant="success">Siap dipinjam</Badge>
            <span className="data text-[13px] text-on-surface" title="Perkiraan; hari libur digeser oleh sistem">
              {formatDate(row.dueAt)}
            </span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(row.barcode)}
          aria-label={`Hapus ${row.barcode} dari antrean`}
          className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        >
          <X className="size-5 stroke-[1.5]" />
        </button>
      </div>
    </li>
  );
}
