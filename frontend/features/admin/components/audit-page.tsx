"use client";

import { useState } from "react";
import { TableSkeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditLogs } from "@/features/admin/api/admin.api";
import type { AuditQuery } from "@/features/admin/schemas/admin.schema";
import { formatDateTime } from "@/lib/format";
import { SettingsNav } from "./settings-nav";

// FE-10.3.2 (FR-A7): who did what. `action` filters by prefix on the backend ("fine." matches fine.waive).
export function AuditPage() {
  const [query, setQuery] = useState<AuditQuery>({ page: 1 });
  const [action, setAction] = useState("");
  const { data, isLoading, error, refetch } = useAuditLogs(query);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading kicker="Pengaturan" title="Log audit" />
      <SettingsNav />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setQuery({ ...query, action: action.trim() || undefined, page: 1 }); }}>
        <Input aria-label="Filter aksi" placeholder="Awalan aksi, mis. fine. atau member." className="w-72" value={action} onChange={(e) => setAction(e.target.value)} />
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {isLoading ? <TableSkeleton cols={5} /> : error ? (
        <EmptyState title="Log gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : !data?.items.length ? (
        <EmptyState title="Tidak ada catatan" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Pelaku</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Objek</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="data whitespace-nowrap">{formatDateTime(l.createdAt)}</TableCell>
                  <TableCell>{l.actor?.name ?? "sistem"}</TableCell>
                  <TableCell className="data">{l.action}</TableCell>
                  <TableCell className="data text-[12px]">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</TableCell>
                  <TableCell className="data max-w-xs truncate text-[12px] text-on-surface-variant" title={JSON.stringify(l.metadata)}>{l.metadata ? JSON.stringify(l.metadata) : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="data flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>Halaman {data.meta.page} dari {data.meta.totalPages} · {data.meta.total} catatan</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={data.meta.page <= 1} onClick={() => setQuery({ ...query, page: data.meta.page - 1 })}>Sebelumnya</Button>
              <Button size="sm" variant="secondary" disabled={data.meta.page >= data.meta.totalPages} onClick={() => setQuery({ ...query, page: data.meta.page + 1 })}>Berikutnya</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
