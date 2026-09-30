import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

export class Page<T> {
  constructor(
    readonly data: T[],
    readonly meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    } & Record<string, unknown>,
  ) {}
}

export const skipTake = ({ page, pageSize }: Pagination) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

/** Jalankan query list + count sekaligus, bungkus jadi Page. */
export async function paginate<T>(
  p: Pagination,
  findMany: (args: { skip: number; take: number }) => Promise<T[]>,
  count: () => Promise<number>,
): Promise<Page<T>> {
  const [data, total] = await Promise.all([findMany(skipTake(p)), count()]);
  return new Page(data, {
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.ceil(total / p.pageSize),
  });
}
