"use client";

import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { Kbd, Skeleton, Stat } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/editorial/page-heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CirculationChart } from "@/features/reports/components/report-chart";
import { useRemindLoan } from "@/features/circulation/api/circulation.api";
import { useDashboard } from "@/features/reports/api/reports.api";
import { formatDate, formatNumber, formatRupiah } from "@/lib/format";

// 04-dasbor, KPI row only (FR-K1: five numbers, not the single one in the mockup).
// Overdue table, ready-for-pickup grid, chart and activity feed land with FE-10.2.1.
export default function StaffDashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const remind = useRemindLoan();

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        kicker="Hari ini"
        title="Dasbor"
        actions={
          <>
            <Link href="/staf/sirkulasi?mode=kembali" className={buttonVariants({ variant: "secondary" })}>
              Pengembalian <Kbd keys={["F3"]} />
            </Link>
            <Link href="/staf/sirkulasi?mode=pinjam" className={buttonVariants()}>
              <ArrowLeftRight aria-hidden /> Buka Sirkulasi <Kbd keys={["F2"]} />
            </Link>
          </>
        }
      />

      {error ? (
        <EmptyState
          kicker="Dasbor"
          title="Data belum bisa dimuat."
          description={error.message}
          action={<Button variant="secondary" onClick={() => refetch()}>Coba lagi</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-y-8 border-b border-outline-variant pb-8 md:grid-cols-5 md:divide-x md:divide-outline-variant">
          {isLoading || !data ? (
            Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="mx-4 h-20" />)
          ) : (
            <>
              <Stat className="md:px-6 md:first:pl-0" label="Dipinjam hari ini" value={formatNumber(data.loansToday)} />
              <Stat className="md:px-6" label="Kembali hari ini" value={formatNumber(data.returnsToday)} />
              <Stat className="md:px-6" label="Terlambat aktif" value={formatNumber(data.overdueActive)} tone="accent" />
              <Stat className="md:px-6" label="Siap diambil" value={formatNumber(data.holdsReady)} />
              <Stat
                className="md:px-6"
                label="Denda belum lunas"
                value={formatRupiah(data.unpaidFinesTotal)}
                hint={`+${formatRupiah(data.unpaidFinesToday)} hari ini`}
              />
            </>
          )}
        </div>
      )}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr]">
            <section className="flex flex-col gap-3">
              <SectionHeading kicker="Tindak lanjut" title="Terlambat" />
              {data.overdue?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Anggota</TableHead>
                      <TableHead>Buku</TableHead>
                      <TableHead className="text-right">Terlambat</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.overdue.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Link href={`/staf/anggota/${l.member.id}`} className="font-semibold hover:underline">
                            {l.member.user.name}
                          </Link>
                          <div className="data text-[12px] text-on-surface-variant">{l.member.memberCode}</div>
                        </TableCell>
                        <TableCell>{l.item.book.title}</TableCell>
                        <TableCell className="data text-right text-primary">{l.daysOverdue} hari</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="secondary" loading={remind.isPending && remind.variables === l.id} disabled={remind.isSuccess && remind.variables === l.id} onClick={() => remind.mutate(l.id)}>
                            {remind.isSuccess && remind.variables === l.id ? "Terkirim" : "Ingatkan"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-body-sm text-on-surface-variant">Tidak ada buku terlambat.</p>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <SectionHeading kicker="Rak reservasi" title="Siap diambil" />
              {data.ready?.length ? (
                <ul className="flex flex-col">
                  {data.ready.map((h) => (
                    <li key={h.id} className="flex items-start justify-between gap-3 border-b border-outline-variant py-2">
                      <div className="min-w-0">
                        <p className="text-book-title truncate">{h.book.title}</p>
                        <p className="data text-[12px] text-on-surface-variant">{h.member.user.name} · {h.item?.barcode ?? "–"}</p>
                      </div>
                      <span className={`data shrink-0 text-[12px] ${h.expiresToday ? "text-primary" : "text-on-surface-variant"}`}>
                        {h.expiresToday ? "batas hari ini" : h.expiresAt ? formatDate(h.expiresAt) : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-on-surface-variant">Rak reservasi kosong.</p>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr]">
            {data.checkouts14d ? (
              <section className="flex flex-col gap-3">
                <SectionHeading kicker="14 hari terakhir" title="Sirkulasi" />
                <CirculationChart points={data.checkouts14d.map((d) => ({ label: d.date.slice(5), checkouts: d.checkouts, returns: d.returns, muted: d.closed }))} />
              </section>
            ) : null}
            <section className="flex flex-col gap-3">
              <SectionHeading kicker="Bulan ini" title="Terpopuler" />
              {data.popularThisMonth?.length ? (
                <ol className="flex flex-col">
                  {data.popularThisMonth.map((b, i) => (
                    <li key={b.id} className="flex items-baseline justify-between gap-3 border-b border-outline-variant py-2">
                      <span className="text-book-title truncate">
                        <span className="data mr-2 text-on-surface-variant">{i + 1}</span>
                        {b.title}
                      </span>
                      <span className="data text-[12px]">{b.loans}×</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-body-sm text-on-surface-variant">Belum ada peminjaman bulan ini.</p>
              )}
            </section>
          </div>

          {data.activity?.length ? (
            <section className="flex flex-col gap-3">
              <SectionHeading kicker="Terbaru" title="Aktivitas" />
              <ul className="data text-[12px]">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 border-b border-outline-variant py-1.5">
                    <span>{a.action.replace("circulation.", "")} · {a.actorName ?? "sistem"}</span>
                    <span className="text-on-surface-variant">{formatDate(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
