import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AiRecommendService } from '../ai/ai-recommend.service.js';
import { BookPresenter } from '../catalog/book.presenter.js';
import type { SearchDto, SearchFilters } from './dto/search.dto.js';
import { FulltextRepository } from './fulltext.repository.js';
import { rrf } from './rrf.js';
import { SemanticSearchAdapter } from './semantic-search.adapter.js';

type Source = 'fulltext' | 'semantic';

export function filterWhere(f: SearchFilters): Prisma.BookWhereInput {
  return {
    deletedAt: null,
    language: f.language?.length ? { in: f.language } : undefined,
    year:
      f.yearFrom || f.yearTo ? { gte: f.yearFrom, lte: f.yearTo } : undefined,
    subjects: f.subject?.length
      ? { some: { subject: { name: { in: f.subject } } } }
      : undefined,
    items: f.available
      ? { some: { status: 'AVAILABLE', deletedAt: null } }
      : undefined,
  };
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fulltext: FulltextRepository,
    private readonly semantic: SemanticSearchAdapter,
    private readonly recommend: AiRecommendService,
    private readonly presenter: BookPresenter,
  ) {}

  /**
   * Hybrid (FR-I2): full-text + semantik digabung RRF, filter, urut, paginasi.
   * Semantik gagal/timeout → full-text saja (`semanticAvailable: false`).
   * Bentuk SearchResponse frontend: { items, total, tookMs, semanticAvailable }.
   */
  async search(dto: SearchDto) {
    const started = performance.now();
    const where = filterWhere(dto);
    let ids: string[];
    let semanticIds = new Set<string>();
    let semanticAvailable = this.semantic.enabled;

    if (dto.q) {
      const [ft, sem] = await Promise.all([
        this.fulltext.search(dto.q),
        dto.mode === 'hybrid'
          ? this.semantic.search(dto.q)
          : Promise.resolve(null),
      ]);
      semanticAvailable = sem !== null;
      semanticIds = new Set(sem ?? []);
      const fused = rrf<Source>({ fulltext: ft, semantic: sem ?? [] });
      // filter diterapkan setelah fusi agar berlaku sama untuk kedua sumber
      // ponytail: kandidat dibatasi 200 full-text + 50 semantik; cukup untuk OPAC sekolah
      const allowed = await this.prisma.book.findMany({
        where: { ...where, id: { in: fused.map((f) => f.id) } },
        select: { id: true },
      });
      const allowedSet = new Set(allowed.map((b) => b.id));
      ids = fused.filter((f) => allowedSet.has(f.id)).map((f) => f.id);
    } else {
      // ponytail: memuat semua id hasil filter (maks ~50 rb); cukup untuk skala PRD
      ids = (
        await this.prisma.book.findMany({
          where,
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        })
      ).map((b) => b.id);
    }

    if (dto.sort !== 'relevance') ids = await this.sortIds(ids, dto.sort);
    const skip = (dto.page - 1) * dto.pageSize;
    const cards = await this.presenter.cardsInOrder(
      ids.slice(skip, skip + dto.pageSize),
    );

    return {
      items: cards.map((b) => ({ ...b, semantic: semanticIds.has(b.id) })),
      total: ids.length,
      page: dto.page,
      pageSize: dto.pageSize,
      totalPages: Math.ceil(ids.length / dto.pageSize),
      tookMs: Math.round(performance.now() - started),
      semanticAvailable,
    };
  }

  private async sortIds(ids: string[], sort: 'newest' | 'title' | 'popular') {
    if (!ids.length) return ids;
    if (sort === 'popular') {
      const counts = await this.prisma.$queryRaw<
        { bookId: string; n: bigint }[]
      >`
        SELECT i."bookId", count(*) AS n FROM "Loan" l JOIN "Item" i ON i.id = l."itemId"
        WHERE i."bookId" = ANY(${ids}::text[]) GROUP BY i."bookId"`;
      const byId = new Map(counts.map((c) => [c.bookId, Number(c.n)]));
      return [...ids].sort((a, b) => (byId.get(b) ?? 0) - (byId.get(a) ?? 0));
    }
    const rows = await this.prisma.book.findMany({
      where: { id: { in: ids } },
      select: { id: true },
      orderBy:
        sort === 'title'
          ? { title: 'asc' }
          : [{ year: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
    return rows.map((r) => r.id);
  }

  /** "Buku serupa" di halaman detail (FR-I5). Tanpa AI → judul lain dengan subjek sama. */
  async similar(bookId: string, k = 8) {
    let ids = (await this.recommend.similar(bookId, k)).map((n) => n.bookId);
    if (!ids.length) {
      const subjects = await this.prisma.bookSubject.findMany({
        where: { bookId },
        select: { subjectId: true },
      });
      ids = (
        await this.prisma.book.findMany({
          where: {
            deletedAt: null,
            id: { not: bookId },
            subjects: {
              some: { subjectId: { in: subjects.map((s) => s.subjectId) } },
            },
          },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: k,
        })
      ).map((b) => b.id);
    }
    return this.presenter.cardsInOrder(ids);
  }
}
