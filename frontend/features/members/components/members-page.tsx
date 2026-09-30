"use client";

import { Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TableSkeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { StatusBadge } from "@/components/editorial/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMembers } from "@/features/members/api/members.api";
import type { MemberQuery } from "@/features/members/schemas/member.schema";
import { formatDate } from "@/lib/format";
import { MEMBER_STATUSES, MEMBER_TYPES } from "@/shared/types/enums";
import { CredentialsDialog, type Credentials } from "./credentials-dialog";
import { MemberFormDialog, STATUS_LABEL, TYPE_LABEL } from "./member-form";
import { MemberImportDialog } from "./member-import-dialog";

// FE-2.4.2: members table with search and type/status filters, plus create and CSV import.
export function MembersPage() {
  const [query, setQuery] = useState<MemberQuery>({ page: 1 });
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const { data, isLoading, error, refetch } = useMembers(query);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        kicker="Keanggotaan"
        title="Anggota"
        actions={
          <>
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload aria-hidden /> Impor CSV
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden /> Tambah Anggota
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery({ ...query, q: search.trim() || undefined, page: 1 });
          }}
        >
          <Input type="search" aria-label="Cari anggota" placeholder="Nama, kode, atau nomor induk" className="w-72" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button type="submit" variant="secondary">
            Cari
          </Button>
        </form>
        <NativeSelect aria-label="Tipe" className="w-auto" value={query.type ?? ""} onChange={(e) => setQuery({ ...query, type: (e.target.value || undefined) as MemberQuery["type"], page: 1 })}>
          <option value="">Semua tipe</option>
          {MEMBER_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Status" className="w-auto" value={query.status ?? ""} onChange={(e) => setQuery({ ...query, status: (e.target.value || undefined) as MemberQuery["status"], page: 1 })}>
          <option value="">Semua status</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
      </div>

      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : error ? (
        <EmptyState title="Anggota gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : !data?.items.length ? (
        <EmptyState title="Tidak ada anggota" description="Tidak ada anggota dengan filter ini." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nomor induk</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kelas / prodi</TableHead>
                <TableHead>Berlaku sampai</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/staf/anggota/${m.id}`} className="font-semibold hover:underline">
                      {m.name}
                    </Link>
                  </TableCell>
                  <TableCell className="data">{m.memberCode}</TableCell>
                  <TableCell className="data">{m.idNumber}</TableCell>
                  <TableCell>{TYPE_LABEL[m.type]}</TableCell>
                  <TableCell>{m.classOrMajor ?? "–"}</TableCell>
                  <TableCell className="data">{formatDate(m.validUntil)}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="data flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>
              Halaman {data.meta.page} dari {data.meta.totalPages} · {data.meta.total} anggota
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={data.meta.page <= 1} onClick={() => setQuery({ ...query, page: data.meta.page - 1 })}>
                Sebelumnya
              </Button>
              <Button size="sm" variant="secondary" disabled={data.meta.page >= data.meta.totalPages} onClick={() => setQuery({ ...query, page: data.meta.page + 1 })}>
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}

      <MemberFormDialog open={creating} onClose={() => setCreating(false)} onCreated={(m) => setCredentials({ name: m.name, login: m.memberCode, temporaryPassword: m.temporaryPassword })} />
      <MemberImportDialog open={importing} onClose={() => setImporting(false)} />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
