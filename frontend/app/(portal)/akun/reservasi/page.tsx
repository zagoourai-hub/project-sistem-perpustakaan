"use client";

import Link from "next/link";
import { Skeleton } from "@/components/editorial/bits";
import { BookCover } from "@/components/editorial/book-cover";
import { CallNumber } from "@/components/editorial/call-number";
import { EmptyState } from "@/components/editorial/empty-state";
import { StatusBadge } from "@/components/editorial/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCancelHold } from "@/features/holds/api/holds.api";
import { useMyHolds } from "@/features/me/api/me.api";
import { formatDate } from "@/lib/format";

// FE-8.4.5: the member's active reservations. Cancelling frees the queue slot.
export default function MyHoldsPage() {
  const { data: holds, isLoading, error, refetch } = useMyHolds();
  const cancel = useCancelHold();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="kicker text-on-surface-variant">Akun</p>
        <h1 className="font-display text-h1 uppercase">Reservasi</h1>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : error ? (
        <EmptyState title="Reservasi gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : !holds?.length ? (
        <EmptyState
          title="Belum ada reservasi"
          description="Buku yang sedang dipinjam semua bisa direservasi dari halaman detailnya."
          action={
            <Link href="/katalog" className={buttonVariants()}>
              Cari buku
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {holds.map((h) => (
            <li key={h.id} className="flex gap-4 rounded border border-outline-variant bg-surface-container-lowest p-4">
              <BookCover title={h.book.title} coverUrl={h.book.coverUrl} width={56} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Link href={`/buku/${h.book.id}`} className="text-book-title hover:underline">
                  {h.book.title}
                </Link>
                <CallNumber value={h.book.callNumber} className="self-start" />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={h.status} />
                  <span className="data text-[12px] text-on-surface-variant">
                    {h.status === "READY"
                      ? `Ambil di meja sirkulasi${h.expiresAt ? ` sebelum ${formatDate(h.expiresAt)}` : ""}`
                      : h.queuePosition
                        ? `Antrean ke-${h.queuePosition}`
                        : ""}
                  </span>
                </div>
                {h.status === "WAITING" || h.status === "READY" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-1 self-start"
                    disabled={cancel.isPending}
                    onClick={() => window.confirm(`Batalkan reservasi ${h.book.title}?`) && cancel.mutate(h.id)}
                  >
                    Batalkan
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
