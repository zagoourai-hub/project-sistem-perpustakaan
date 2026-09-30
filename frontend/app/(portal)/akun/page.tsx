"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { SectionHeading } from "@/components/editorial/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/features/auth/api/auth.api";
import { useMyHolds, useMyLoans } from "@/features/me/api/me.api";
import { LoanSlipList } from "@/features/me/components/loan-slip-list";
import { RecommendationsStrip } from "@/features/me/components/recommendations-strip";
import { daysUntil, formatRupiah } from "@/lib/format";

const today = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

// 07-portal-anggota: greeting, overdue alert, DueSlip list.
// Reservasi, "Untuk kamu" and Riwayat sections land with FE-8.4.2.
export default function PortalHomePage() {
  const { data: user } = useMe();
  const { data: loans, isLoading } = useMyLoans();
  const { data: holds } = useMyHolds();
  const readyHolds = holds?.filter((h) => h.status === "READY") ?? [];

  const overdue = loans?.filter((l) => daysUntil(l.dueAt) < 0) ?? [];
  const overdueFine = overdue.reduce((sum, l) => sum + l.accruedFine, 0);
  const firstName = user?.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="data text-[11px] tracking-wider text-on-surface-variant uppercase">{today.format(new Date())}</p>
        <h1 className="mt-1 font-display text-h1 text-on-surface uppercase">Halo{firstName ? `, ${firstName}` : ""}.</h1>
        {loans ? (
          <p className="mt-1 text-body-md text-on-surface-variant">
            {loans.length ? `${loans.length} buku sedang kamu pinjam.` : "Tidak ada buku yang sedang kamu pinjam."}
          </p>
        ) : null}
      </section>

      {overdue.length ? (
        <div className="flex items-center justify-between gap-3 rounded-xs border border-outline-variant border-l-2 border-l-primary bg-surface-container-lowest px-4 py-3">
          <p className="text-body-sm text-on-surface">
            {overdue.length} buku terlambat{overdueFine > 0 ? <> · denda <span className="data text-primary">{formatRupiah(overdueFine)}</span></> : " · denda dihitung saat buku dikembalikan"}
          </p>
          <Link href="/akun/riwayat" className="inline-flex shrink-0 items-center gap-1 text-label font-semibold text-primary">
            Lihat detail <ArrowRight className="size-4 stroke-[1.5]" aria-hidden />
          </Link>
        </div>
      ) : null}

      {readyHolds.length ? (
        <div className="flex items-center justify-between gap-3 rounded-xs border border-outline-variant border-l-2 border-l-on-tertiary-container bg-surface-container-lowest px-4 py-3">
          <p className="text-body-sm">{readyHolds.length} reservasi siap diambil di meja sirkulasi.</p>
          <Link href="/akun/reservasi" className="inline-flex shrink-0 items-center gap-1 text-label font-semibold text-primary">
            Lihat <ArrowRight className="size-4 stroke-[1.5]" aria-hidden />
          </Link>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionHeading kicker="Jatuh tempo" title={`Pinjaman aktif${loans ? ` (${loans.length})` : ""}`} />
        {isLoading ? (
          <>
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </>
        ) : loans?.length ? (
          <LoanSlipList loans={loans} />
        ) : (
          <EmptyState
            kicker="Pinjaman aktif"
            title="Belum ada pinjaman."
            description="Semua buku telah dikembalikan. Jelajahi katalog untuk meminjam bacaan baru."
            action={
              <Link href="/katalog" className={buttonVariants({ variant: "ghost" })}>
                Jelajahi katalog <ArrowRight aria-hidden />
              </Link>
            }
          />
        )}
      </section>

      <RecommendationsStrip />
    </div>
  );
}
