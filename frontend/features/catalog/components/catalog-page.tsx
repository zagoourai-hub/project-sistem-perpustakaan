"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TableSkeleton } from "@/components/editorial/bits";
import { BookCover } from "@/components/editorial/book-cover";
import { CallNumber } from "@/components/editorial/call-number";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { AvailabilityLine } from "@/components/editorial/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBooks } from "@/features/catalog/api/books.api";

// FE-4.3.2. ?q= comes from the staff shell's global search box.
export function CatalogPage() {
  const initialQ = useSearchParams().get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useBooks({ q: q || undefined, page });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        kicker="Koleksi"
        title="Katalog"
        actions={
          <Link href="/staf/katalog/baru" className={buttonVariants()}>
            <Plus aria-hidden /> Tambah Buku
          </Link>
        }
      />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search.trim());
          setPage(1);
        }}
      >
        <Input type="search" aria-label="Cari buku" placeholder="Judul, pengarang, ISBN, atau nomor panggil" className="max-w-md" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="secondary">
          Cari
        </Button>
      </form>

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : error ? (
        <EmptyState title="Katalog gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : !data?.items.length ? (
        <EmptyState
          title={q ? "Tidak ada buku yang cocok" : "Katalog masih kosong"}
          action={
            <Link href="/staf/katalog/baru" className={buttonVariants()}>
              Tambah Buku
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Pengarang</TableHead>
                <TableHead>Nomor panggil</TableHead>
                <TableHead className="text-right">Tahun</TableHead>
                <TableHead>Eksemplar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/staf/katalog/${b.id}`} className="flex items-center gap-3 hover:underline">
                      <BookCover title={b.title} coverUrl={b.coverUrl} width={32} />
                      <span className="text-book-title">{b.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{b.authors.map((a) => a.name).join(", ")}</TableCell>
                  <TableCell>
                    <CallNumber value={b.callNumber} />
                  </TableCell>
                  <TableCell className="data text-right">{b.year ?? "–"}</TableCell>
                  <TableCell>
                    <AvailabilityLine available={b.availability.available} total={b.availability.total} shelf={b.availability.shelves.join(", ") || undefined} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="data flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>
              Halaman {data.meta.page} dari {data.meta.totalPages} · {data.meta.total} judul
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
