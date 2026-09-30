"use client";

import Link from "next/link";
import { BookCover } from "@/components/editorial/book-cover";
import { SectionHeading } from "@/components/editorial/page-heading";
import { AvailabilityLine } from "@/components/editorial/status-badge";
import { useRecommendations } from "@/features/me/api/me.api";

// FE-8.4.8 (FR-I5): "Untuk kamu". Empty until the member has loan history and embeddings exist, so it hides itself.
export function RecommendationsStrip() {
  const { data } = useRecommendations();
  if (!data?.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading kicker="Berdasarkan bacaanmu" title="Untuk kamu" />
      <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
        {data.map((b) => (
          <li key={b.id} className="w-32 shrink-0">
            <Link href={`/buku/${b.id}`} className="flex flex-col gap-1.5 hover:underline">
              <BookCover title={b.title} coverUrl={b.coverUrl} width={128} />
              <span className="text-book-title line-clamp-2">{b.title}</span>
              <AvailabilityLine available={b.availability.available} total={b.availability.total} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
