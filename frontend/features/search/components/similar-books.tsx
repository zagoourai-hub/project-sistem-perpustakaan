"use client";

import Link from "next/link";
import { BookCover } from "@/components/editorial/book-cover";
import { CallNumber } from "@/components/editorial/call-number";
import { SectionHeading } from "@/components/editorial/page-heading";
import { AvailabilityLine } from "@/components/editorial/status-badge";
import { useSimilarBooks } from "@/features/catalog/api/books.api";

// FE-8.3.7. Hidden when the AI service has nothing to offer (empty list is normal without embeddings).
export function SimilarBooks({ bookId }: { bookId: string }) {
  const { data } = useSimilarBooks(bookId);
  if (!data?.length) return null;
  return (
    <section className="flex flex-col gap-5">
      <SectionHeading kicker="Berdasarkan kemiripan isi & tema" title="Buku serupa" />
      <ul className="grid grid-cols-2 gap-6 md:grid-cols-5">
        {data.slice(0, 5).map((b) => (
          <li key={b.id}>
            <Link href={`/buku/${b.id}`} className="flex flex-col gap-2 hover:underline">
              <BookCover title={b.title} coverUrl={b.coverUrl} width={160} className="w-full" />
              <CallNumber value={b.callNumber} className="self-start" />
              <span className="text-book-title">{b.title}</span>
              <span className="text-body-sm text-on-surface-variant">
                {b.authors.map((a) => a.name).join(", ")}
                {b.year ? ` (${b.year})` : ""}
              </span>
              <AvailabilityLine available={b.availability.available} total={b.availability.total} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
