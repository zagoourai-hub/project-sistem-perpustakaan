import { z } from 'zod';

/** Query string bisa berisi satu nilai atau berulang (?subject=a&subject=b). */
const many = z
  .union([z.string(), z.array(z.string())])
  .transform((v) =>
    (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean),
  )
  .optional();

// Sama dengan frontend features/search/schemas/search.schema.ts
export const SEARCH_SORTS = [
  'relevance',
  'newest',
  'title',
  'popular',
] as const;

export const searchSchema = z.object({
  q: z.string().trim().max(200).default(''),
  subject: many,
  language: many,
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
  available: z.stringbool().optional(),
  sort: z.enum(SEARCH_SORTS).catch('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  // mode=fulltext untuk mematikan semantik (debug / perbandingan)
  mode: z.enum(['hybrid', 'fulltext']).default('hybrid'),
});
export type SearchDto = z.infer<typeof searchSchema>;
export type SearchFilters = Pick<
  SearchDto,
  'subject' | 'language' | 'yearFrom' | 'yearTo' | 'available'
>;
