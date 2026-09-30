import Link from "next/link";
import { BookCover } from "@/components/editorial/book-cover";
import { CallNumber } from "@/components/editorial/call-number";
import { AvailabilityLine } from "@/components/editorial/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { ReserveButton } from "@/features/holds/components/reserve-button";
import type { SearchResult } from "@/shared/types/models";

// FE-8.3.5 (10-hasil-pencarian): cover, title + call number, meta, 2-line synopsis, availability, action.
export function BookResultRow({ book }: { book: SearchResult }) {
  const { availability: a } = book;
  return (
    <li className="flex gap-4 border-b border-outline-variant py-5">
      <Link href={`/buku/${book.id}`} aria-hidden tabIndex={-1}>
        <BookCover title={book.title} coverUrl={book.coverUrl} width={72} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/buku/${book.id}`} className="text-book-title text-on-surface hover:text-primary hover:underline">
            {book.title}
          </Link>
          <CallNumber value={book.callNumber} />
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {[book.authors.map((x) => x.name).join(", "), book.year, book.publisher?.name].filter(Boolean).join(" · ")}
        </p>
        {book.synopsis ? <p className="line-clamp-2 text-body-sm text-on-surface-variant">{book.synopsis}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <AvailabilityLine available={a.available} total={a.total} shelf={a.shelves.join(", ") || undefined} />
          {a.available === 0 && a.holdQueue > 0 ? <span className="data text-[12px] text-on-surface-variant">{a.holdQueue} antrean</span> : null}
          {book.semantic ? <span className="data text-[11px] text-on-surface-variant">hasil semantik</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 self-center">
        <Link href={`/buku/${book.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Lihat
        </Link>
        <ReserveButton bookId={book.id} available={a.available} size="sm" />
      </div>
    </li>
  );
}
