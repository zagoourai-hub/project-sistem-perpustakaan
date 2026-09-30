"use client";

import { useState } from "react";
import { TableSkeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { StatusBadge } from "@/components/editorial/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCancelHold, useHolds, type HoldQuery } from "@/features/holds/api/holds.api";
import { formatDate } from "@/lib/format";

const TABS = [
  { value: "READY", label: "Siap diambil" },
  { value: "WAITING", label: "Antrean" },
] as const;

// FE-7.2.3. READY = copy set aside on the reservation shelf; WAITING = queue per title (queuePosition).
export function HoldsPage() {
  const [query, setQuery] = useState<HoldQuery>({ status: "READY", page: 1 });
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch } = useHolds(query);
  const cancel = useCancelHold();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading kicker="Sirkulasi" title="Reservasi" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-1" role="tablist" aria-label="Status reservasi">
          {TABS.map((t) => (
            <Button
              key={t.value}
              role="tab"
              aria-selected={query.status === t.value}
              variant={query.status === t.value ? "primary" : "secondary"}
              size="sm"
              onClick={() => setQuery({ ...query, status: t.value, page: 1 })}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery({ ...query, q: search.trim() || undefined, page: 1 });
          }}
        >
          <Input type="search" aria-label="Cari reservasi" placeholder="Judul, nama, atau kode anggota" className="w-72" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button type="submit" variant="secondary">
            Cari
          </Button>
        </form>
      </div>

      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : error ? (
        <EmptyState title="Reservasi gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : !data?.items.length ? (
        <EmptyState title={query.status === "READY" ? "Tidak ada buku menunggu diambil" : "Tidak ada antrean"} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buku</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{query.status === "READY" ? "Batas ambil" : "Masuk antrean"}</TableHead>
                <TableHead>{query.status === "READY" ? "Eksemplar" : "Antrean"}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-book-title">{h.book.title}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{h.member?.name}</div>
                    <div className="data text-[12px] text-on-surface-variant">{[h.member?.memberCode, h.member?.classOrMajor].filter(Boolean).join(" · ")}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={h.status} />
                  </TableCell>
                  <TableCell className="data">{formatDate(query.status === "READY" && h.expiresAt ? h.expiresAt : h.queuedAt)}</TableCell>
                  <TableCell className="data">{query.status === "READY" ? (h.item?.barcode ?? "–") : h.queuePosition ? `ke-${h.queuePosition}` : "–"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={cancel.isPending}
                      onClick={() => window.confirm(`Batalkan reservasi ${h.book.title} atas nama ${h.member?.name}?`) && cancel.mutate(h.id)}
                    >
                      Batalkan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="data flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>
              Halaman {data.meta.page} dari {data.meta.totalPages} · {data.meta.total} reservasi
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
    </div>
  );
}
