"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Skeleton } from "@/components/editorial/bits";
import { CallNumber } from "@/components/editorial/call-number";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading, SectionHeading } from "@/components/editorial/page-heading";
import { AvailabilityLine, StatusBadge } from "@/components/editorial/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { booksApi, useBook } from "@/features/catalog/api/books.api";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatRupiah } from "@/lib/format";
import { AddItemsDialog } from "./add-items-dialog";
import { CoverUpload } from "./cover-upload";
import { CONDITION_LABEL, SOURCE_LABEL } from "./copies-fields";

// FE-4.3.8 + FE-4.3.9: detail, cover upload, copies table with label printing. Editing metadata is not built yet.
export function BookDetail({ id }: { id: string }) {
  const { data: book, isLoading, error, refetch } = useBook(id);
  const [adding, setAdding] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !book) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <EmptyState title={notFound ? "Buku tidak ditemukan" : "Buku gagal dimuat"} action={notFound ? undefined : <Button onClick={() => void refetch()}>Coba lagi</Button>} />;
  }

  const meta: [string, string | number | null][] = [
    ["Penerbit", book.publisher?.name ?? null],
    ["Tahun", book.year],
    ["ISBN-13", book.isbn13],
    ["ISBN-10", book.isbn10],
    ["Bahasa", book.language],
    ["Halaman", book.pages],
    ["DDC", book.ddc],
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        kicker="Katalog buku"
        title={book.title}
        actions={
          <Button onClick={() => setAdding(true)}>Tambah eksemplar</Button>
        }
      />

      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <CoverUpload bookId={id} title={book.title} author={book.authors[0]?.name} coverUrl={book.coverUrl} />

        <div className="flex flex-col gap-4">
          {book.subtitle ? <p className="text-body-md text-on-surface-variant">{book.subtitle}</p> : null}
          <p className="text-body-md">{book.authors.map((a) => a.name).join(", ")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <CallNumber value={book.callNumber} />
            <AvailabilityLine available={book.availability.available} total={book.availability.total} shelf={book.availability.shelves.join(", ") || undefined} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
            {meta.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <dt className="kicker text-on-surface-variant">{k}</dt>
                <dd className="data text-[13px]">{v ?? "–"}</dd>
              </div>
            ))}
          </dl>
          {book.subjects.length ? <p className="data text-[12px] text-on-surface-variant">{book.subjects.map((s) => s.name).join(" · ")}</p> : null}
          {book.synopsis ? <p className="max-w-prose text-body-md">{book.synopsis}</p> : null}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeading
          kicker="Fisik"
          title={`Eksemplar (${book.items.length})`}
          actions={
            book.items.length ? (
              <div className="flex gap-2">
                <Link href={`/staf/katalog/label?book=${book.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  <Printer aria-hidden /> Lembar label
                </Link>
                <Button variant="secondary" size="sm" onClick={() => void booksApi.downloadLabels(book.items.map((i) => i.id))}>
                  PDF label
                </Button>
              </div>
            ) : undefined
          }
        />
        {book.items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barcode</TableHead>
                <TableHead>Rak</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {book.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="data">{i.barcode}</TableCell>
                  <TableCell className="data">{i.shelfLocation.code}</TableCell>
                  <TableCell>
                    <StatusBadge status={i.status} />
                    {i.dueAt ? <span className="data ml-2 text-[11px] text-on-surface-variant">jatuh tempo {formatDate(i.dueAt)}</span> : null}
                  </TableCell>
                  <TableCell>{i.condition ? CONDITION_LABEL[i.condition] : "–"}</TableCell>
                  <TableCell>{SOURCE_LABEL[i.source]}</TableCell>
                  <TableCell className="data text-right">{i.price != null ? formatRupiah(i.price) : "–"}</TableCell>
                  <TableCell className="data">{formatDate(i.acquiredAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" aria-label={`Cetak label ${i.barcode}`} onClick={() => void booksApi.downloadLabels([i.id])}>
                      <Printer />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="Belum ada eksemplar" description="Buku ini belum bisa dipinjam sebelum punya eksemplar." action={<Button onClick={() => setAdding(true)}>Tambah eksemplar</Button>} />
        )}
      </section>

      <AddItemsDialog bookId={id} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
