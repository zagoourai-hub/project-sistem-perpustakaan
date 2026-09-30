"use client";

import Link from "next/link";
import { useState } from "react";
import { Skeleton } from "@/components/editorial/bits";
import { CallNumber } from "@/components/editorial/call-number";
import { EmptyState } from "@/components/editorial/empty-state";
import { SectionHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { useMyFines, useMyHistory } from "@/features/me/api/me.api";
import { formatDate, formatRupiah } from "@/lib/format";

// FE-8.4.4: fines still owed, then every past loan, newest first.
export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useMyHistory({ page, pageSize: 10 });
  const { data: fines } = useMyFines();
  const owed = fines?.filter((f) => f.status === "UNPAID") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="kicker text-on-surface-variant">Akun</p>
        <h1 className="font-display text-h1 uppercase">Riwayat</h1>
      </div>

      {owed.length ? (
        <section className="flex flex-col gap-2 rounded-xs border border-outline-variant border-l-2 border-l-primary bg-surface-container-lowest p-4">
          <SectionHeading kicker="Tagihan" title="Denda belum lunas" />
          <ul className="data text-[13px]">
            {owed.map((f) => (
              <li key={f.id} className="flex justify-between gap-3 py-1">
                <span className="min-w-0 truncate font-sans">{f.book.title}</span>
                <span className="font-semibold text-primary">{formatRupiah(f.outstanding)}</span>
              </li>
            ))}
          </ul>
          <p className="text-body-sm text-on-surface-variant">Pembayaran dilakukan di meja sirkulasi.</p>
        </section>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : error ? (
        <EmptyState title="Riwayat gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : !data?.items.length ? (
        <EmptyState title="Belum ada riwayat" description="Buku yang sudah kamu kembalikan akan muncul di sini." />
      ) : (
        <>
          <ul className="flex flex-col">
            {data.items.map((l) => (
              <li key={l.id} className="flex flex-col gap-1 border-b border-outline-variant py-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/buku/${l.item.book.id}`} className="text-book-title hover:underline">
                    {l.item.book.title}
                  </Link>
                  <CallNumber value={l.item.book.callNumber} />
                </div>
                <p className="data text-[12px] text-on-surface-variant">
                  Dipinjam {formatDate(l.checkedOutAt)} · {l.returnedAt ? `dikembalikan ${formatDate(l.returnedAt)}` : `jatuh tempo ${formatDate(l.dueAt)}`}
                </p>
              </li>
            ))}
          </ul>
          <div className="data flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>
              Halaman {data.meta.page} dari {data.meta.totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Sebelumnya
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
