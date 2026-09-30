import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

/**
 * Full-text (tsvector 'simple') + trigram (toleran typo) pada judul & pengarang.
 * Mengembalikan id terurut relevansi.
 */
@Injectable()
export class FulltextRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = 200): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH q AS (SELECT websearch_to_tsquery('simple', ${q}) AS tsq)
      SELECT b.id
      FROM q, "Book" b
      LEFT JOIN LATERAL (
        SELECT max(similarity(a.name, ${q})) AS sim
        FROM "BookAuthor" ba JOIN "Author" a ON a.id = ba."authorId"
        WHERE ba."bookId" = b.id
      ) au ON true
      WHERE b."deletedAt" IS NULL
        AND (
          b."searchVector" @@ q.tsq
          OR b.title % ${q}
          OR EXISTS (
            SELECT 1 FROM "BookAuthor" ba JOIN "Author" a ON a.id = ba."authorId"
            WHERE ba."bookId" = b.id AND (a.name % ${q} OR a.name ILIKE '%' || ${q} || '%')
          )
        )
      ORDER BY
        ts_rank(b."searchVector", q.tsq) * 2
        + greatest(similarity(b.title, ${q}), coalesce(au.sim, 0)) DESC,
        b.title ASC
      LIMIT ${limit}`;
    return rows.map((r) => r.id);
  }
}
