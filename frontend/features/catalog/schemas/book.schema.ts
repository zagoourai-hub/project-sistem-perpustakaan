import { z } from "zod";
import { ITEM_CONDITIONS, ITEM_SOURCES } from "@/shared/types/enums";

const currentYear = new Date().getFullYear();

/** Multi-select with inline create: existing rows carry an id, new ones only a name. */
const refOrNew = z.object({ id: z.string().optional(), name: z.string().trim().min(1) });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const isbnSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[-\s]/g, ""))
  .pipe(z.string().regex(/^(\d{9}[\dXx]|\d{13})$/, "ISBN harus 10 atau 13 digit"));

export const bookSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(300),
  subtitle: optionalText(300),
  authors: z.array(refOrNew).min(1, "Minimal satu pengarang"),
  publisher: refOrNew.nullable(),
  year: z.coerce
    .number({ error: "Tahun tidak valid" })
    .int()
    .min(1500, "Tahun tidak valid")
    .max(currentYear + 1, "Tahun tidak valid"),
  isbn13: z.union([isbnSchema, z.literal("").transform(() => null)]).nullable(),
  isbn10: z.union([isbnSchema, z.literal("").transform(() => null)]).nullable(),
  language: z.string().trim().min(1, "Bahasa wajib diisi"),
  pages: z.coerce.number().int().positive("Jumlah halaman tidak valid").nullable().optional(),
  ddc: z.string().trim().regex(/^\d{3}(\.\d+)?$/, "Format DDC mis. 899.221"),
  callNumber: z.string().trim().min(1, "Nomor panggil wajib diisi").max(40),
  subjects: z.array(refOrNew),
  synopsis: optionalText(2000),
});
export type BookFormInput = z.input<typeof bookSchema>;
export type BookFormValues = z.output<typeof bookSchema>;

export const bookQuerySchema = z.object({
  q: z.string().trim().optional(),
  subjectId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type BookQuery = z.input<typeof bookQuerySchema>;

// FR-B5: JPEG/PNG/WebP, max 2 MB.
export const coverSchema = z
  .instanceof(File, { error: "Pilih berkas gambar" })
  .refine((f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type), "Format harus JPG, PNG, atau WebP")
  .refine((f) => f.size <= 2 * 1024 * 1024, "Maksimal 2 MB");

export const addItemsSchema = z.object({
  count: z.coerce.number().int().min(1, "Minimal 1").max(100, "Maksimal 100"),
  shelfLocationId: z.string().min(1, "Lokasi rak wajib diisi sebelum mencetak barcode"),
  source: z.enum(ITEM_SOURCES),
  price: z.coerce.number().int().min(0, "Harga tidak valid"),
  condition: z.enum(ITEM_CONDITIONS),
  /** Manual barcodes for migration (FR-B3); auto PST-YYYY-seq6 when empty. */
  barcodes: z.array(z.string().trim().min(1)).optional(),
});
export type AddItemsInput = z.input<typeof addItemsSchema>;
export type AddItemsValues = z.output<typeof addItemsSchema>;

export const updateItemSchema = z.object({
  shelfLocationId: z.string().min(1).optional(),
  condition: z.enum(ITEM_CONDITIONS).optional(),
  price: z.coerce.number().int().min(0).optional(),
});
export type UpdateItemValues = z.output<typeof updateItemSchema>;

export const masterDataSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(160),
  /** Shelf locations only, e.g. "B-04". */
  code: z.string().trim().max(20).optional(),
});
export type MasterDataValues = z.infer<typeof masterDataSchema>;

/**
 * Nomor panggil suggestion shown under the field in 12-tambah-buku:
 * DDC + 3 letters of the first author's surname (upper) + 1 letter of the title (lower).
 * "899.221", "Andrea Hirata", "Laskar Pelangi" → "899.221 HIR l"
 */
export function suggestCallNumber(ddc: string, author: string, title: string): string {
  const surname = author.trim().split(/\s+/).at(-1) ?? "";
  // Skip English leading articles only; "Sang Pemimpi" stays "s" (see 11-detail-buku mockup).
  const titleWord = title.trim().replace(/^(the|a|an)\s+/i, "");
  return [ddc.trim(), surname.slice(0, 3).toUpperCase(), titleWord.charAt(0).toLowerCase()]
    .filter(Boolean)
    .join(" ");
}
