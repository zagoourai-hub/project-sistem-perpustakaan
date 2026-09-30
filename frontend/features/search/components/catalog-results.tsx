"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";
import { BookRowsSkeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useSearch, useSearchState } from "../api/search.api";
import { SEARCH_SORTS, type SearchParams } from "../schemas/search.schema";
import { BookResultRow } from "./book-result-row";
import { SearchFilters } from "./search-filters";

const SORT_LABEL: Record<SearchParams["sort"], string> = {
  relevance: "Paling relevan",
  newest: "Terbaru",
  title: "Judul A–Z",
  popular: "Paling dipinjam",
};

// FE-8.3.3 (10-hasil-pencarian). Filters, sort and page live in the URL.
export function CatalogResults() {
  const { params, setParams } = useSearchState();
  const [draft, setDraft] = useState(params.q);
  const { data, isLoading, error, refetch } = useSearch(params);

  return (
    <div className="flex flex-col gap-8 py-8">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q: draft.trim() });
        }}
      >
        <div className="flex h-16 items-center rounded border border-outline bg-surface-container-lowest px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-on-surface">
          <Search className="mr-3 size-[22px] shrink-0 stroke-[1.5] text-on-surface-variant" aria-hidden />
          <input
            type="search"
            aria-label="Pencarian buku"
            placeholder="Judul, pengarang, subjek — atau jelaskan buku yang kamu cari…"
            className="w-full bg-transparent text-body-md outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {draft ? (
            <button
              type="button"
              aria-label="Hapus kata kunci"
              className="mr-2 text-on-surface-variant hover:text-on-surface"
              onClick={() => {
                setDraft("");
                setParams({ q: "" });
              }}
            >
              <X className="size-5 stroke-[1.5]" />
            </button>
          ) : null}
          <Button type="submit" className="px-6">
            Cari
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <p className="kicker text-on-surface-variant">{params.q ? "Hasil pencarian" : "Semua koleksi"}</p>
          <h1 className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-h1 uppercase">{data ? data.total : "–"} judul</span>
            {params.q ? (
              <span className="text-body-sm text-on-surface-variant">
                untuk “<strong className="text-on-surface">{params.q}</strong>”{data ? <span className="data"> · {(data.tookMs / 1000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} detik</span> : null}
              </span>
            ) : null}
          </h1>
        </div>
        <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          Urutkan
          <NativeSelect className="h-9 w-auto" value={params.sort} onChange={(e) => setParams({ sort: e.target.value as SearchParams["sort"] })}>
            {SEARCH_SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <SearchFilters params={params} onChange={setParams} />
        <div>
          {data && !data.semanticAvailable && params.q ? (
            <p className="data mb-3 text-[12px] text-on-surface-variant">Pencarian semantik sedang tidak tersedia; menampilkan hasil teks biasa.</p>
          ) : null}
          {isLoading ? (
            <BookRowsSkeleton rows={5} />
          ) : error ? (
            <EmptyState title="Pencarian gagal" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
          ) : !data?.items.length ? (
            <EmptyState title="Tidak ada buku yang cocok" description="Coba kata kunci lain, atau longgarkan filter di sebelah kiri." />
          ) : (
            <>
              <ul>
                {data.items.map((b) => (
                  <BookResultRow key={b.id} book={b} />
                ))}
              </ul>
              <div className="data mt-6 flex items-center justify-between text-[12px] text-on-surface-variant">
                <span>
                  Halaman {data.page} dari {data.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={data.page <= 1} onClick={() => setParams({ page: data.page - 1 })}>
                    Sebelumnya
                  </Button>
                  <Button size="sm" variant="secondary" disabled={data.page >= data.totalPages} onClick={() => setParams({ page: data.page + 1 })}>
                    Berikutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
