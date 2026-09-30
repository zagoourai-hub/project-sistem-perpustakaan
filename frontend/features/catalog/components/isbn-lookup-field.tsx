"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { booksApi } from "@/features/catalog/api/books.api";
import { isbnSchema } from "@/features/catalog/schemas/book.schema";
import { ApiError } from "@/lib/api-client";
import type { BookDraft } from "@/shared/types/models";

// FE-4.3.4, step 1 of 12-tambah-buku. A USB scanner types the ISBN and sends Enter, which runs the lookup.
// The draft only prefills the form; nothing is saved (FR-B2).
export function IsbnLookupField({ onDraft }: { onDraft: (draft: BookDraft) => void }) {
  const [isbn, setIsbn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<BookDraft | null>(null);
  const lookup = useMutation({ mutationFn: booksApi.isbnLookup });

  const run = () => {
    const parsed = isbnSchema.safeParse(isbn);
    setFound(null);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "ISBN tidak valid");
    setError(null);
    lookup.mutate(parsed.data, {
      onSuccess: (draft) => {
        setFound(draft);
        if (draft.found === false) setError("ISBN tidak ditemukan di Open Library. Isi manual di bawah.");
        else onDraft(draft);
      },
      onError: (e) => setError(e instanceof ApiError && e.status === 404 ? "ISBN tidak ditemukan di Open Library. Isi manual di bawah." : "Pencarian gagal. Isi manual di bawah."),
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded border border-outline-variant bg-surface-container-lowest p-6">
      <div className="flex items-baseline justify-between">
        <span className="kicker text-on-surface-variant">Langkah 1 — Pencarian ISBN</span>
        <span className="data text-[11px] text-on-surface-variant uppercase">Open Library</span>
      </div>
      <div className="flex gap-3">
        <Input
          aria-label="ISBN"
          inputMode="numeric"
          autoFocus
          placeholder="Scan atau ketik ISBN-10 / ISBN-13"
          className="data h-14 text-lg"
          value={isbn}
          aria-invalid={Boolean(error)}
          onChange={(e) => setIsbn(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              run();
            }
          }}
        />
        <Button type="button" variant="secondary" className="h-14" loading={lookup.isPending} onClick={run}>
          <Search aria-hidden /> Cari Data
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {error}
        </p>
      ) : null}
      {found && found.found !== false ? (
        <p className="flex items-center gap-2 text-body-sm text-secondary" role="status">
          <CheckCircle2 className="size-4 stroke-[1.5]" aria-hidden />
          Data ditemukan di Open Library — periksa dan lengkapi sebelum menyimpan.
        </p>
      ) : null}
      {found?.existingBookId ? (
        <p className="text-body-sm text-on-tertiary-container" role="status">
          ISBN ini sudah ada di katalog.{" "}
          <Link href={`/staf/katalog/${found.existingBookId}`} className="underline">
            Buka buku yang ada
          </Link>{" "}
          untuk menambah eksemplar.
        </p>
      ) : null}
    </section>
  );
}
