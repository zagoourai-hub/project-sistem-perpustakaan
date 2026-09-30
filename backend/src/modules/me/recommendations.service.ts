import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AiRecommendService } from '../ai/ai-recommend.service.js';
import { BookPresenter } from '../catalog/book.presenter.js';

const K = 12;

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiRecommendService,
    private readonly books: BookPresenter,
  ) {}

  /** BookSummary[] "Untuk kamu" (FR-I5). Tanpa riwayat/embedding → koleksi populer 90 hari yang belum pernah dipinjam. */
  async forMember(memberId: string) {
    let ids: string[] = [];
    try {
      ids = (await this.ai.forMember(memberId, K)).map((n) => n.bookId);
    } catch (e) {
      this.logger.warn(`Rekomendasi personal gagal: ${(e as Error).message}`);
    }
    if (!ids.length) {
      ids = await this.popular(memberId);
    }
    return this.books.cardsInOrder(ids);
  }

  private async popular(memberId: string) {
    const since = new Date(Date.now() - 90 * 86_400_000);
    const rows = await this.prisma.$queryRaw<{ bookId: string }[]>`
      SELECT i."bookId"
      FROM "Loan" l
      JOIN "Item" i ON i.id = l."itemId"
      JOIN "Book" b ON b.id = i."bookId" AND b."deletedAt" IS NULL
      WHERE l."checkedOutAt" >= ${since}
        AND i."bookId" NOT IN (
          SELECT i2."bookId" FROM "Loan" l2 JOIN "Item" i2 ON i2.id = l2."itemId" WHERE l2."memberId" = ${memberId}
        )
      GROUP BY i."bookId"
      ORDER BY count(*) DESC
      LIMIT ${K}`;
    if (rows.length) return rows.map((r) => r.bookId);
    // katalog baru tanpa riwayat sirkulasi: judul terbaru
    const latest = await this.prisma.book.findMany({
      where: {
        deletedAt: null,
        items: { none: { loans: { some: { memberId } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: K,
      select: { id: true },
    });
    return latest.map((b) => b.id);
  }
}
