import { Injectable } from '@nestjs/common';
import pgvector from 'pgvector';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface Neighbor {
  bookId: string;
  score: number; // cosine similarity (1 = identik)
}

/** Akses pgvector lewat raw SQL (Prisma belum mendukung tipe vector). */
@Injectable()
export class VectorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hashes(bookIds: string[]) {
    const rows = await this.prisma.bookEmbedding.findMany({
      where: { bookId: { in: bookIds } },
      select: { bookId: true, contentHash: true },
    });
    return new Map(rows.map((r) => [r.bookId, r.contentHash]));
  }

  upsert(
    bookId: string,
    embedding: number[],
    model: string,
    contentHash: string,
  ) {
    const vec = pgvector.toSql(embedding);
    return this.prisma.$executeRaw`
      INSERT INTO "BookEmbedding" ("bookId", embedding, model, "contentHash", "updatedAt")
      VALUES (${bookId}, ${vec}::vector, ${model}, ${contentHash}, now())
      ON CONFLICT ("bookId") DO UPDATE
      SET embedding = EXCLUDED.embedding, model = EXCLUDED.model,
          "contentHash" = EXCLUDED."contentHash", "updatedAt" = now()`;
  }

  delete(bookId: string) {
    return this.prisma
      .$executeRaw`DELETE FROM "BookEmbedding" WHERE "bookId" = ${bookId}`;
  }

  /** Top-K judul terdekat (HNSW, cosine). Buku terhapus & yang di-exclude dilewati. */
  async nearest(
    embedding: number[],
    k: number,
    exclude: string[] = [],
  ): Promise<Neighbor[]> {
    const vec = pgvector.toSql(embedding);
    const rows = await this.prisma.$queryRaw<
      { bookId: string; score: number }[]
    >`
      SELECT e."bookId", 1 - (e.embedding <=> ${vec}::vector) AS score
      FROM "BookEmbedding" e
      JOIN "Book" b ON b.id = e."bookId" AND b."deletedAt" IS NULL
      WHERE NOT (e."bookId" = ANY(${exclude}::text[]))
      ORDER BY e.embedding <=> ${vec}::vector
      LIMIT ${k}`;
    return rows.map((r) => ({ bookId: r.bookId, score: Number(r.score) }));
  }

  async vectors(bookIds: string[]): Promise<number[][]> {
    if (!bookIds.length) return [];
    const rows = await this.prisma.$queryRaw<{ embedding: string }[]>`
      SELECT embedding::text AS embedding FROM "BookEmbedding" WHERE "bookId" = ANY(${bookIds}::text[])`;
    return rows.map((r) => pgvector.fromSql(r.embedding) as number[]);
  }

  async stats() {
    const [row] = await this.prisma.$queryRaw<
      { total: bigint; embedded: bigint }[]
    >`
      SELECT
        (SELECT count(*) FROM "Book" WHERE "deletedAt" IS NULL) AS total,
        (SELECT count(*) FROM "BookEmbedding" e JOIN "Book" b ON b.id = e."bookId" AND b."deletedAt" IS NULL) AS embedded`;
    return { total: Number(row.total), embedded: Number(row.embedded) };
  }
}
