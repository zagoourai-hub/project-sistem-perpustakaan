"use client";

import { cn } from "@/lib/cn";
import { Bookmark, CircleAlert, CircleUser, Inbox, LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/editorial/book-cover";
import { CallNumber } from "@/components/editorial/call-number";
import { StatusBadge } from "@/components/editorial/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatRupiah } from "@/lib/format";
import type { CheckinResult } from "@/shared/types/models";
import type { ReturnRow } from "@/stores/circulation.store";

/** 06-sirkulasi-kembali: newest return on top; each row says where the copy goes next. */
export function CheckinPanel({ rows }: { rows: ReturnRow[] }) {
  if (!rows.length) {
    return (
      <p className="py-16 text-center text-body-sm text-on-surface-variant">
        Scan barcode buku yang dikembalikan. Tidak perlu scan kartu anggota.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-outline-variant">
      {rows.map((row, i) => (
        <li
          key={row.id}
          className={cn(
            "py-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1",
            i === 0 && "-mx-4 border-l-2 border-on-surface bg-surface-container-lowest px-4",
          )}
        >
          {row.state === "checking" ? (
            <div className="data flex items-center gap-3 text-[13px] text-on-surface-variant">
              <LoaderCircle className="size-4 animate-spin" aria-hidden /> Memproses {row.barcode}…
            </div>
          ) : row.state === "error" ? (
            <div className="flex items-center gap-2 text-body-sm font-semibold text-primary-container dark:text-primary">
              <CircleAlert className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
              <span className="data font-normal">{row.barcode}</span> — {row.message}
            </div>
          ) : (
            <ReturnResult result={row.result} fresh={i === 0} />
          )}
        </li>
      ))}
    </ul>
  );
}

function ReturnResult({ result, fresh }: { result: CheckinResult; fresh: boolean }) {
  const { loan, member, fine, heldFor, returnToShelf } = result;
  const book = loan.item.book;
  const lateDays = loan.returnedAt
    ? Math.max(0, Math.round((Date.parse(loan.returnedAt) - Date.parse(loan.dueAt)) / 86_400_000))
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <BookCover title={book.title} coverUrl={book.coverUrl} width={52} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-book-title text-on-surface">{book.title}</span>
              <CallNumber value={book.callNumber} />
              {fresh ? <span className="data text-[10px] tracking-wider text-on-surface-variant uppercase">Baru saja</span> : null}
            </div>
            <span className="text-body-sm text-on-surface-variant">
              {book.authors.map((a) => a.name).join(", ")} · <span className="data text-[12px]">{loan.item.barcode}</span>
            </span>
            <span className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
              <CircleUser className="size-4 stroke-[1.5]" aria-hidden />
              Peminjam: <span className="font-semibold text-on-surface">{member.name}</span> · {member.classOrMajor}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
          {heldFor ? (
            <>
              <Badge variant="warning">Simpan untuk reservasi</Badge>
              <span className="text-body-sm text-on-surface-variant">{lateDays ? `Terlambat ${lateDays} hari` : "Tepat waktu"}</span>
            </>
          ) : fine ? (
            <>
              <StatusBadge status="OVERDUE" label={`Terlambat ${lateDays} hari`} />
              <span className="data text-lg font-semibold text-primary-container dark:text-primary">Denda: {formatRupiah(fine.amount)}</span>
              <Link href={`/staf/denda?fine=${fine.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Terima pembayaran
              </Link>
            </>
          ) : (
            <span className="data flex items-center gap-1.5 text-[13px] text-on-surface-variant">
              <Inbox className="size-4 stroke-[1.5]" aria-hidden />
              Kembali ke <span className="font-semibold text-on-surface">rak {returnToShelf ?? loan.item.shelfLocation.code}</span>
            </span>
          )}
        </div>
      </div>

      {heldFor ? (
        <div className="ml-[68px] flex flex-col gap-2 rounded-xs border-l-[3px] border-on-tertiary-container bg-surface-container-high/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-body-sm text-on-surface">
              <span className="font-bold">Antrean #1:</span> {heldFor.memberName} · {heldFor.classOrMajor}
              <span className="text-on-surface-variant">
                {" "}
                — notifikasi email terkirim{heldFor.expiresAt ? ` · batas ambil ${formatDate(heldFor.expiresAt)}` : ""}
              </span>
            </p>
            <Bookmark className="size-5 shrink-0 stroke-[1.5] text-tertiary-container dark:text-on-tertiary-container" aria-hidden />
          </div>
          <p className="data flex items-center gap-1.5 border-t border-outline-variant pt-2 text-[12px] text-on-surface">
            <TriangleAlert className="size-4 stroke-[1.5] text-tertiary-container dark:text-on-tertiary-container" aria-hidden />
            <span className="font-semibold">Instruksi:</span> letakkan di rak reservasi meja staf, bukan rak koleksi.
          </p>
        </div>
      ) : null}
    </div>
  );
}
