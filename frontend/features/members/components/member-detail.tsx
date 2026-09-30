"use client";

import { useState } from "react";
import { Skeleton, Stat } from "@/components/editorial/bits";
import { CallNumber } from "@/components/editorial/call-number";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading, SectionHeading } from "@/components/editorial/page-heading";
import { StatusBadge } from "@/components/editorial/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFines } from "@/features/circulation/api/circulation.api";
import { useMember, useMemberLoans, useResetMemberPassword } from "@/features/members/api/members.api";
import { ApiError } from "@/lib/api-client";
import type { Loan } from "@/shared/types/models";
import { daysUntil, formatDate, formatRupiah } from "@/lib/format";
import { CredentialsDialog, type Credentials } from "./credentials-dialog";
import { MarkLostDialog } from "@/features/circulation/components/mark-lost-dialog";
import { MemberCardPrint } from "./member-card-print";
import { MemberFormDialog, TYPE_LABEL } from "./member-form";

// FE-2.4.4: profile, active loans and fines. Loan history has no staff endpoint yet (only /me/history).
export function MemberDetail({ id }: { id: string }) {
  const { data: member, isLoading, error, refetch } = useMember(id);
  const { data: loans } = useMemberLoans(id);
  const { data: fines } = useFines({ q: member?.memberCode, status: "UNPAID" });
  const reset = useResetMemberPassword();
  const [editing, setEditing] = useState(false);
  const [card, setCard] = useState(false);
  const [lost, setLost] = useState<Loan | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !member) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <EmptyState title={notFound ? "Anggota tidak ditemukan" : "Anggota gagal dimuat"} action={notFound ? undefined : <Button onClick={() => void refetch()}>Coba lagi</Button>} />;
  }

  const profile: [string, string][] = [
    ["Kode anggota", member.memberCode],
    ["Nomor induk", member.idNumber],
    ["Tipe", TYPE_LABEL[member.type]],
    ["Kelas / prodi", member.classOrMajor ?? "–"],
    ["Email", member.email ?? "–"],
    ["Nomor HP", member.phone ?? "–"],
    ["Berlaku sampai", formatDate(member.validUntil)],
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        kicker="Anggota"
        title={member.name}
        actions={
          <>
            <Button
              variant="secondary"
              loading={reset.isPending}
              onClick={() =>
                window.confirm(`Reset kata sandi ${member.name}? Kata sandi lama tidak berlaku lagi.`) &&
                reset.mutate(id, { onSuccess: (r) => setCredentials({ name: member.name, login: member.memberCode, temporaryPassword: r.temporaryPassword }) })
              }
            >
              Reset kata sandi
            </Button>
            <Button variant="secondary" onClick={() => setCard(true)}>
              Cetak kartu
            </Button>
            <Button onClick={() => setEditing(true)}>Ubah</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={member.status} />
        {member.unpaidFines >= member.blockingFineThreshold ? <StatusBadge status="OVERDUE" label="Peminjaman diblokir: denda" /> : null}
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Pinjaman aktif" value={`${member.activeLoans} / ${member.maxActiveLoans}`} />
        <Stat label="Terlambat" value={String(member.overdueLoans ?? 0)} tone={member.overdueLoans ? "accent" : "default"} />
        <Stat label="Reservasi siap" value={String(member.readyHolds)} />
        <Stat label="Denda belum lunas" value={formatRupiah(member.unpaidFines)} tone={member.unpaidFines ? "accent" : "default"} />
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-outline-variant pt-5 md:grid-cols-4">
        {profile.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="kicker text-on-surface-variant">{k}</dt>
            <dd className="data text-[13px]">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <SectionHeading kicker="Sirkulasi" title="Sedang dipinjam" />
        {loans?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buku</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Jatuh tempo</TableHead>
                <TableHead className="text-right">Denda berjalan</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-book-title">{l.item.book.title}</TableCell>
                  <TableCell>
                    <CallNumber value={l.item.barcode} />
                  </TableCell>
                  <TableCell className="data">
                    {formatDate(l.dueAt)}
                    {daysUntil(l.dueAt) < 0 ? <span className="ml-2 text-primary-container dark:text-primary">terlambat</span> : null}
                  </TableCell>
                  <TableCell className="data text-right">{l.accruedFine ? formatRupiah(l.accruedFine) : "–"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => setLost(l)}>
                      Hilang / rusak
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-body-sm text-on-surface-variant">Tidak ada pinjaman aktif.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading kicker="Keuangan" title="Denda belum lunas" />
        {fines?.items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buku</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fines.items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.book.title}</TableCell>
                  <TableCell className="data">{formatDate(f.createdAt)}</TableCell>
                  <TableCell className="data text-right font-semibold">{formatRupiah(f.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-body-sm text-on-surface-variant">Tidak ada denda.</p>
        )}
      </section>

      <MemberFormDialog open={editing} member={member} onClose={() => setEditing(false)} />
      <MarkLostDialog loan={lost} onClose={() => setLost(null)} />
      <MemberCardPrint member={member} open={card} onClose={() => setCard(false)} />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
