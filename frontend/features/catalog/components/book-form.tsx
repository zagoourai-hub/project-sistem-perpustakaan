"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { PageHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { booksApi, useCreateBook } from "@/features/catalog/api/books.api";
import { addItemsSchema, bookSchema, suggestCallNumber } from "@/features/catalog/schemas/book.schema";
import { applyServerErrors } from "@/lib/form";
import type { BookDraft } from "@/shared/types/models";
import { useQueryClient } from "@tanstack/react-query";
import { COPIES_DEFAULTS, CopiesFields } from "./copies-fields";
import { IsbnLookupField } from "./isbn-lookup-field";
import { TagInput } from "./tag-input";

const schema = bookSchema.extend({ copies: addItemsSchema });
type Input = z.input<typeof schema>;
type Output = z.output<typeof schema>;

const LANGUAGES = { id: "Indonesia", en: "Inggris", ar: "Arab" } as const;

// FE-4.3.5 + FE-4.3.7 (mockup 12). Cover upload lives on the detail page: it needs the book id.
export function BookForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const createBook = useCreateBook();
  const [saving, setSaving] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      authors: [],
      subjects: [],
      publisher: null,
      isbn13: "",
      isbn10: "",
      language: "id",
      ddc: "",
      callNumber: "",
      copies: COPIES_DEFAULTS,
    },
  });

  const [title, ddc, authors, callNumber, synopsis] = useWatch({ control, name: ["title", "ddc", "authors", "callNumber", "synopsis"] });
  const suggestion = ddc && authors[0] && title ? suggestCallNumber(ddc, authors[0].name, title) : "";

  const applyDraft = (d: BookDraft) => {
    const set = (k: keyof Input, v: unknown) => v != null && setValue(k, v as never, { shouldDirty: true });
    set("title", d.title);
    set("subtitle", d.subtitle);
    set("authors", d.authors?.map((name) => ({ name })));
    set("publisher", d.publisher ? { name: d.publisher } : null);
    set("year", d.year ?? undefined);
    set("isbn13", d.isbn13);
    set("isbn10", d.isbn10);
    set("language", d.language ?? undefined);
    set("pages", d.pages);
    set("synopsis", d.synopsis);
  };

  const save = async (withItems: boolean) => {
    // Draft = book without copies: validate only the bibliographic part.
    const parsed = bookSchema.safeParse(getValues());
    if (!parsed.success) {
      for (const i of parsed.error.issues) setError(i.path.join(".") as keyof Input, { message: i.message });
      return;
    }
    setSaving(true);
    try {
      const book = await createBook.mutateAsync(parsed.data);
      if (withItems) {
        const items = addItemsSchema.parse(getValues("copies"));
        await booksApi.addItems(book.id, items);
        await qc.invalidateQueries({ queryKey: ["books"] });
      }
      router.push(`/staf/katalog/${book.id}`);
    } catch (e) {
      applyServerErrors(e, setError);
      setSaving(false);
    }
  };

  // Ctrl+S saves and Esc cancels from anywhere on the page, not only while a field has focus.
  const saveAll = handleSubmit(() => save(true));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveAll();
      } else if (e.key === "Escape" && !document.querySelector("[role=dialog]")) router.push("/staf/katalog");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const copiesErrors = errors.copies ?? {};

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={handleSubmit(() => save(true))}
    >
      <PageHeading
        kicker="Katalog buku"
        title="Tambah buku"
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => router.push("/staf/katalog")}>
              Batal
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void save(false)}>
              Simpan tanpa eksemplar
            </Button>
            <Button type="submit" loading={saving}>
              Simpan &amp; Buat Eksemplar
            </Button>
          </>
        }
      />

      <IsbnLookupField onDraft={applyDraft} />

      {errors.root?.server ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {errors.root.server.message}
        </p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-5">
          <span className="kicker border-b border-outline-variant pb-2 text-on-surface-variant">Langkah 2 — Metadata bibliografi</span>

          <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
            <Field label="Judul buku" htmlFor="title" error={errors.title?.message} required>
              <Input id="title" aria-invalid={Boolean(errors.title)} {...register("title")} />
            </Field>
            <Field label="Subjudul" htmlFor="subtitle" error={errors.subtitle?.message}>
              <Input id="subtitle" placeholder="Opsional" {...register("subtitle")} />
            </Field>
          </div>

          <Field label="Pengarang / penulis" htmlFor="authors" error={errors.authors?.message} required>
            <Controller
              control={control}
              name="authors"
              render={({ field }) => (
                <TagInput id="authors" kind="authors" placeholder="Tambah pengarang" value={field.value} onChange={field.onChange} invalid={Boolean(errors.authors)} />
              )}
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Penerbit" htmlFor="publisher" error={errors.publisher?.message}>
              <Controller
                control={control}
                name="publisher"
                render={({ field }) => (
                  <Input id="publisher" value={field.value?.name ?? ""} onChange={(e) => field.onChange(e.target.value ? { name: e.target.value } : null)} />
                )}
              />
            </Field>
            <Field label="Tahun terbit" htmlFor="year" error={errors.year?.message} required>
              <Input id="year" type="number" aria-invalid={Boolean(errors.year)} {...register("year")} />
            </Field>
            <Field label="ISBN-13" htmlFor="isbn13" error={errors.isbn13?.message}>
              <Input id="isbn13" inputMode="numeric" className="data" aria-invalid={Boolean(errors.isbn13)} {...register("isbn13")} />
            </Field>
            <Field label="ISBN-10" htmlFor="isbn10" error={errors.isbn10?.message}>
              <Input id="isbn10" inputMode="numeric" className="data" aria-invalid={Boolean(errors.isbn10)} {...register("isbn10")} />
            </Field>
            <Field label="Bahasa" htmlFor="language" error={errors.language?.message} required>
              <NativeSelect id="language" {...register("language")}>
                {Object.entries(LANGUAGES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Jumlah halaman" htmlFor="pages" error={errors.pages?.message}>
              <Input id="pages" type="number" min={1} aria-invalid={Boolean(errors.pages)} {...register("pages", { setValueAs: (v) => (v === "" ? undefined : v) })} />
            </Field>
            <Field label="Klasifikasi DDC" htmlFor="ddc" error={errors.ddc?.message} required>
              <Input id="ddc" className="data" placeholder="899.221" aria-invalid={Boolean(errors.ddc)} {...register("ddc")} />
            </Field>
            <Field
              label="Nomor panggil"
              htmlFor="callNumber"
              error={errors.callNumber?.message}
              required
              hint={
                suggestion && suggestion !== callNumber ? (
                  <button type="button" className="underline" onClick={() => setValue("callNumber", suggestion, { shouldValidate: true })}>
                    Pakai saran: {suggestion}
                  </button>
                ) : (
                  "DDC + 3 huruf pengarang + 1 huruf judul"
                )
              }
            >
              <Input id="callNumber" className="data" aria-invalid={Boolean(errors.callNumber)} {...register("callNumber")} />
            </Field>
          </div>

          <Field label="Subjek / topik terkait" htmlFor="subjects" error={errors.subjects?.message}>
            <Controller
              control={control}
              name="subjects"
              render={({ field }) => <TagInput id="subjects" kind="subjects" placeholder="Tambah subjek" value={field.value} onChange={field.onChange} />}
            />
          </Field>

          <Field label="Sinopsis ringkas" htmlFor="synopsis" error={errors.synopsis?.message} aside={`${synopsis?.length ?? 0} / 2000`}>
            <textarea
              id="synopsis"
              rows={6}
              maxLength={2000}
              className="w-full rounded border border-outline bg-surface-container-lowest p-3 text-body-md text-on-surface"
              {...register("synopsis")}
            />
          </Field>
        </section>

        <aside className="flex flex-col gap-4 lg:border-l lg:border-outline-variant lg:pl-8">
          <span className="kicker border-b border-outline-variant pb-2 text-on-surface-variant">Eksemplar fisik</span>
          <CopiesFields p={(k) => register(`copies.${k}`)} errors={copiesErrors} />
          <p className="data rounded-xs bg-surface-container-high p-3 text-[11px] text-on-surface-variant">
            Barcode PST-{new Date().getFullYear()}-nnnnnn dibuat otomatis saat disimpan. Sampul diunggah di halaman detail buku.
          </p>
          <p className="data text-[11px] text-on-surface-variant">
            Simpan: Ctrl+S · Batal: Esc
          </p>
        </aside>
      </div>
    </form>
  );
}
