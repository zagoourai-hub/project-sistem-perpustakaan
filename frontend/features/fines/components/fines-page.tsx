"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { StatusBadge } from "@/components/editorial/status-badge";
import { TableSkeleton } from "@/components/editorial/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFine, useFines } from "@/features/circulation/api/circulation.api";
import type { FineQuery } from "@/features/circulation/schemas/circulation.schema";
import { formatDate, formatRupiah } from "@/lib/format";
import { useSessionRole } from "@/stores/session.store";
import type { Fine } from "@/shared/types/models";
import { PaymentDialog } from "./payment-dialog";
import { WaiveDialog } from "./waive-dialog";

const TYPE_LABEL = { OVERDUE: "Terlambat", LOST: "Hilang", DAMAGED: "Rusak" } as const;
const STATUS_TABS = [
  { value: "UNPAID", label: "Belum lunas" },
  { value: "PAID", label: "Lunas" },
  { value: "WAIVED", label: "Dihapuskan" },
] as const;

// FE-6.4.9. ?fine=<id> (from the checkin result's "Terima pembayaran") opens the payment dialog directly.
export function FinesPage() {
  const router = useRouter();
  const deepLinkId = useSearchParams().get("fine");
  const isAdmin = useSessionRole() === "ADMIN";
  const [query, setQuery] = useState<FineQuery>({ status: "UNPAID", page: 1 });
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState<Fine | null>(null);
  const [waiving, setWaiving] = useState<Fine | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading, error, refetch } = useFines(query);
  const linked = useFine(dismissed ? null : deepLinkId).data;
  const payTarget = paying ?? (linked?.status === "UNPAID" ? linked : null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading kicker="Sirkulasi" title="Denda" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-1" role="tablist" aria-label="Status denda">
          {STATUS_TABS.map((t) => (
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
            setQuery({ ...query, q: search || undefined, page: 1 });
          }}
        >
          <Input
            type="search"
            aria-label="Cari denda"
            placeholder="Nama, kode anggota, judul, barcode"
            className="w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Cari
          </Button>
        </form>
      </div>

      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : error ? (
        <EmptyState title="Denda gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : !data?.items.length ? (
        <EmptyState title="Tidak ada denda" description="Tidak ada denda dengan filter ini." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anggota</TableHead>
                <TableHead>Buku</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="text-right">Tagihan</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="font-semibold">{f.member.name}</div>
                    <div className="data text-[12px] text-on-surface-variant">
                      {[f.member.memberCode, f.member.classOrMajor].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{f.book.title}</div>
                    <div className="data text-[12px] text-on-surface-variant">{formatDate(f.createdAt)}</div>
                  </TableCell>
                  <TableCell>{TYPE_LABEL[f.type]}</TableCell>
                  <TableCell className="data text-right">{formatRupiah(f.amount)}</TableCell>
                  <TableCell className="data text-right font-semibold">{formatRupiah(f.outstanding)}</TableCell>
                  <TableCell>
                    <StatusBadge status={f.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {f.status === "UNPAID" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => setPaying(f)}>
                          Terima
                        </Button>
                        {isAdmin ? (
                          <Button size="sm" variant="secondary" onClick={() => setWaiving(f)}>
                            Hapuskan
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="data flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>
              Halaman {data.meta.page} dari {data.meta.totalPages} · {data.meta.total} denda
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

      <PaymentDialog
        fine={payTarget}
        onClose={() => {
          setPaying(null);
          setDismissed(true);
          if (deepLinkId) router.replace("/staf/denda", { scroll: false });
        }}
      />
      <WaiveDialog fine={waiving} onClose={() => setWaiving(null)} />
    </div>
  );
}
