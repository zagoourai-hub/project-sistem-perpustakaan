import { z } from 'zod';
import { paginationSchema } from '../../../common/pagination/pagination.schema.js';

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish();

const isbn = (len: 10 | 13) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[-\s]/g, '').toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          len === 13 ? /^\d{13}$/ : /^\d{9}[\dX]$/,
          `ISBN-${len} tidak valid`,
        ),
    )
    .nullish()
    .or(z.literal('').transform(() => null));

// Master data: string nama, atau { id?, name } dari combobox frontend. Dicocokkan lewat nama (unik).
const ref = z
  .union([
    z.string(),
    z.object({ id: z.string().optional(), name: z.string() }),
  ])
  .transform((v) => (typeof v === 'string' ? v : v.name).trim())
  .pipe(z.string().min(1).max(200));
const names = z.array(ref).max(20);

export const createBookSchema = z.object({
  title: z.string().trim().min(1).max(300),
  subtitle: text(300),
  isbn13: isbn(13),
  isbn10: isbn(10),
  // master data dikirim sebagai nama; dibuat otomatis bila belum ada
  publisher: ref.nullish(),
  authors: names.default([]),
  subjects: names.default([]),
  year: z.number().int().min(1000).max(2200).nullish(),
  language: z.string().trim().min(2).max(10).default('id'),
  pages: z.number().int().min(1).max(100_000).nullish(),
  ddc: text(20),
  callNumber: text(50),
  synopsis: text(5000),
});
export type CreateBookDto = z.infer<typeof createBookSchema>;

export const updateBookSchema = createBookSchema.partial();
export type UpdateBookDto = z.infer<typeof updateBookSchema>;

export const bookQuerySchema = paginationSchema.extend({
  q: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  subjectId: z.string().optional(),
  sort: z.enum(['title', 'newest']).default('newest'),
});
export type BookQuery = z.infer<typeof bookQuerySchema>;

export type BookDraft = Partial<
  Pick<
    CreateBookDto,
    | 'title'
    | 'subtitle'
    | 'isbn13'
    | 'isbn10'
    | 'publisher'
    | 'year'
    | 'pages'
    | 'authors'
    | 'subjects'
  >
> & {
  coverUrl?: string | null;
  existingBookId?: string | null;
  language?: string | null;
  synopsis?: string | null;
};
