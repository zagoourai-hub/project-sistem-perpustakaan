"use client";

import Link from "next/link";
import { Skeleton } from "@/components/editorial/bits";
import { BookCover } from "@/components/editorial/book-cover";
import { EmptyState } from "@/components/editorial/empty-state";
import { IndexCard } from "@/components/editorial/index-card";
import { Button } from "@/components/ui/button";
import { useBook } from "@/features/catalog/api/books.api";
import { ReserveButton } from "@/features/holds/components/reserve-button";
import { ApiError } from "@/lib/api-client";
import { SimilarBooks } from "./similar-books";

const LANGUAGE = { id: "Indonesia", en: "Inggris", ar: "Arab" } as Record<string, string>;

// FE-8.3.6 (11-detail-buku): cover column (empty in the mockup, a bug), IndexCard, copies table, similar books.
export function PublicBookDetail({ id }: { id: string }) {
  const { data: book, isLoading, error, refetch } = useBook(id);

  if (isLoading) return <Skeleton className="my-12 h-96 w-full" />;
  if (error || !book) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="py-12">
        <EmptyState
          title={notFound ? "Buku tidak ditemukan" : "Buku gagal dimuat"}
          action={notFound ? <Link href="/katalog" className="underline">Kembali ke katalog</Link> : <Button onClick={() => void refetch()}>Coba lagi</Button>}
        />
      </div>
    );
  }

  const fields = [
    { label: "Penerbit", value: book.publisher?.name ?? "—" },
    { label: "Tahun terbit", value: book.year ?? "—" },
    { label: "Nomor ISBN", value: book.isbn13 ?? book.isbn10 ?? "—" },
    { label: "Tebal halaman", value: book.pages ? `${book.pages} halaman` : "—" },
    { label: "Bahasa", value: LANGUAGE[book.language] ?? book.language },
    { label: "Klasifikasi", value: book.ddc ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-12 py-8">
      <nav aria-label="Jejak halaman" className="data flex items-center justify-between border-b border-outline-variant pb-4 text-[12px] text-on-surface-variant">
        <span>
          <Link href="/katalog" className="hover:underline">Katalog</Link>
          {book.subjects[0] ? <> / {book.subjects[0].name}</> : null} / <span className="font-semibold text-on-surface">{book.title}</span>
        </span>
        <button type="button" className="hover:underline" onClick={() => history.back()}>
          ← Kembali ke hasil pencarian
        </button>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[3fr_9fr]">
        <BookCover title={book.title} author={book.authors[0]?.name} coverUrl={book.coverUrl} width={220} priority />
        <IndexCard
          callNumber={book.callNumber}
          title={book.title}
          authors={book.authors}
          year={book.year}
          availability={book.availability}
          fields={fields}
          subjects={book.subjects.map((s) => s.name)}
          synopsis={book.synopsis}
          items={book.items}
          actions={<ReserveButton bookId={book.id} available={book.availability.available} />}
        />
      </div>

      <SimilarBooks bookId={book.id} />
    </div>
  );
}
