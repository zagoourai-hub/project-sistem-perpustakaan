import { z } from "zod";

export const SEARCH_SORTS = ["relevance", "newest", "title", "popular"] as const;

/** URL state for /katalog (PRD FE-8.3 use-search: filters live in searchParams). */
export const searchParamsSchema = z.object({
  q: z.string().trim().default(""),
  subject: z.array(z.string()).default([]),
  language: z.array(z.string()).default([]),
  available: z.stringbool().optional(),
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
  sort: z.enum(SEARCH_SORTS).catch("relevance"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type SearchParams = z.output<typeof searchParamsSchema>;

const MULTI = new Set(["subject", "language"]);

/** URLSearchParams → validated filters. Invalid values fall back instead of throwing. */
export function parseSearchParams(params: URLSearchParams | Record<string, string | string[] | undefined>): SearchParams {
  const entries =
    params instanceof URLSearchParams
      ? [...new Set(params.keys())].map((k) => [k, MULTI.has(k) ? params.getAll(k) : params.get(k)] as const)
      : Object.entries(params).map(([k, v]) => [k, MULTI.has(k) ? [v ?? []].flat() : [v].flat()[0]] as const);
  const result = searchParamsSchema.safeParse(Object.fromEntries(entries.filter(([, v]) => v !== "" && v != null)));
  return result.success ? result.data : searchParamsSchema.parse({});
}

/** Filters → query string (drops defaults so URLs stay short). */
export function toSearchQueryString(p: Partial<SearchParams>): string {
  const out = new URLSearchParams();
  if (p.q) out.set("q", p.q);
  p.subject?.forEach((s) => out.append("subject", s));
  p.language?.forEach((l) => out.append("language", l));
  if (p.available !== undefined) out.set("available", String(p.available));
  if (p.yearFrom) out.set("yearFrom", String(p.yearFrom));
  if (p.yearTo) out.set("yearTo", String(p.yearTo));
  if (p.sort && p.sort !== "relevance") out.set("sort", p.sort);
  if (p.page && p.page > 1) out.set("page", String(p.page));
  return out.toString();
}
