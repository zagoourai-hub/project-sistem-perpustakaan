import { Search } from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/editorial/book-cover";
import { AvailabilityLine } from "@/components/editorial/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { endpoints } from "@/lib/endpoints";
import { clock } from "@/lib/today";
import { publicFetch } from "@/lib/server-fetch";
import type { BookSummary } from "@/shared/types/models";


const POPULAR = ["Sejarah Indonesia", "Novel remaja", "Fisika kelas XI", "Filsafat", "Buku baru"];

// 09-opac-home: masthead + search. "Baru di rak" / "Paling dipinjam" land with FE-8.3.1
// once the backend exposes those lists (not in PRD §9.4 yet).
interface OpacHome {
  stats: { titles: number; items: number; available: number; activeMembers: number };
  newest: BookSummary[];
  popularThisMonth: { id: string; title: string; callNumber: string; loans: number; cover?: { small: string } | null; authors: string[] }[];
}
const EMPTY: OpacHome = { stats: { titles: 0, items: 0, available: 0, activeMembers: 0 }, newest: [], popularThisMonth: [] };

export default async function OpacHomePage() {
  const { edition } = await clock();
  const home = await publicFetch<OpacHome>(endpoints.opac.home, EMPTY, 60);
  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6">
      <header className="pt-12">
        <p className="kicker text-on-surface-variant">Edisi {edition}</p>
        <h1 className="mt-6 pb-8 font-display text-[56px] leading-[0.92] tracking-tight text-on-surface uppercase select-none sm:text-[84px] lg:text-[112px]">
          Cari buku,
          <br className="hidden sm:inline" /> bukan rak.
        </h1>
        <div className="h-0.5 w-full bg-on-surface" aria-hidden />
      </header>

      <section aria-label="Pencarian katalog" className="mt-12">
        <form action="/katalog" method="get" role="search">
          <div className="flex h-16 w-full items-center rounded border border-outline bg-surface-container-lowest px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-on-surface">
            <Search className="mr-3 size-[22px] shrink-0 stroke-[1.5] text-on-surface-variant" aria-hidden />
            <input
              name="q"
              type="search"
              required
              aria-label="Pencarian buku"
              placeholder="Judul, pengarang, subjek — atau jelaskan buku yang kamu cari…"
              className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70"
            />
            <button type="submit" className={buttonVariants({ className: "ml-2 px-6" })}>
              Cari
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-body-sm text-on-surface-variant">Pencarian populer:</span>
            {POPULAR.map((q) => (
              <Link
                key={q}
                href={`/katalog?q=${encodeURIComponent(q)}`}
                className="rounded-xs border border-outline-variant bg-surface-container-lowest px-3 py-1 text-body-sm whitespace-nowrap text-on-surface-variant hover:border-outline hover:text-on-surface"
              >
                {q}
              </Link>
            ))}
          </div>
          <p className="max-w-sm text-xs text-on-surface-variant italic">
            Boleh pakai kalimat biasa, misalnya “novel tentang persahabatan di sekolah”.
          </p>
        </div>
      </section>

      {home.stats.titles ? (
        <dl className="data mt-12 grid grid-cols-2 gap-6 border-y border-outline-variant py-6 md:grid-cols-4">
          {[
            ["Judul", home.stats.titles],
            ["Eksemplar", home.stats.items],
            ["Tersedia", home.stats.available],
            ["Anggota aktif", home.stats.activeMembers],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dd className="text-data-lg">{v}</dd>
              <dt className="text-xs font-semibold tracking-[0.08em] uppercase">{k}</dt>
            </div>
          ))}
        </dl>
      ) : null}

      {home.newest.length ? (
        <section className="mt-12" aria-labelledby="baru">
          <p className="kicker text-on-surface-variant">Koleksi</p>
          <h2 id="baru" className="border-b border-outline-variant pb-2 font-display text-h2 uppercase">Baru di rak</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-6">
            {home.newest.map((b) => (
              <li key={b.id}>
                <Link href={`/buku/${b.id}`} className="flex flex-col gap-2 hover:underline">
                  <BookCover title={b.title} coverUrl={b.coverUrl} width={160} className="w-full" />
                  <span className="text-book-title">{b.title}</span>
                  <span className="text-body-sm text-on-surface-variant">{b.authors.map((a) => a.name).join(", ")}</span>
                  <AvailabilityLine available={b.availability.available} total={b.availability.total} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {home.popularThisMonth.length ? (
        <section className="mt-12" aria-labelledby="populer">
          <p className="kicker text-on-surface-variant">Bulan ini</p>
          <h2 id="populer" className="border-b border-outline-variant pb-2 font-display text-h2 uppercase">Paling dipinjam</h2>
          <ol className="mt-2">
            {home.popularThisMonth.map((b, i) => (
              <li key={b.id} className="flex items-baseline gap-4 border-b border-outline-variant py-3">
                <span className="data w-6 text-on-surface-variant">{i + 1}</span>
                <Link href={`/buku/${b.id}`} className="text-book-title flex-1 hover:underline">{b.title}</Link>
                <span className="text-body-sm text-on-surface-variant">{b.authors.join(", ")}</span>
                <span className="data text-[12px]">{b.loans}×</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
