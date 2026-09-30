"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { BookCover } from "@/components/editorial/book-cover";
import { useUploadCover } from "@/features/catalog/api/books.api";
import { coverSchema } from "@/features/catalog/schemas/book.schema";

// FE-4.3.6 (FR-B5): cover preview + upload, JPG/PNG/WebP up to 2 MB. Validated here before the request.
export function CoverUpload({ bookId, title, author, coverUrl }: { bookId: string; title: string; author?: string; coverUrl: string | null }) {
  const upload = useUploadCover(bookId);
  const [error, setError] = useState<string | null>(null);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const ok = coverSchema.safeParse(file);
    if (!ok.success) return setError(ok.error.issues[0]?.message ?? "Berkas tidak valid");
    setError(null);
    upload.mutate(file, { onError: () => setError("Unggah gagal. Coba lagi.") });
  };

  return (
    <div className="flex flex-col gap-3">
      <BookCover title={title} author={author} coverUrl={coverUrl} width={200} />
      <label className="inline-flex cursor-pointer items-center gap-2 text-label text-on-surface underline">
        <Upload className="size-4 stroke-[1.5]" aria-hidden />
        {upload.isPending ? "Mengunggah…" : "Unggah sampul"}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
      </label>
      <span className="data text-[11px] text-on-surface-variant">JPG, PNG, WebP · maks. 2 MB</span>
      {error ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {error}
        </p>
      ) : null}
    </div>
  );
}
