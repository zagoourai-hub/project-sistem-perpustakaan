import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { centroid } from './centroid.js';
import { type Neighbor, VectorRepository } from './vector.repository.js';

const HISTORY_SIZE = 10;

@Injectable()
export class AiRecommendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vectors: VectorRepository,
  ) {}

  /** "Buku serupa" (FR-L3): tetangga terdekat dari embedding judul. Tidak memanggil API. */
  async similar(bookId: string, k = 8): Promise<Neighbor[]> {
    const [vec] = await this.vectors.vectors([bookId]);
    return vec ? this.vectors.nearest(vec, k, [bookId]) : [];
  }

  /** "Untuk kamu" (FR-L4): centroid N pinjaman terakhir, exclude semua yang pernah dipinjam. */
  async forMember(memberId: string, k = 12): Promise<Neighbor[]> {
    const loans = await this.prisma.loan.findMany({
      where: { memberId },
      orderBy: { checkedOutAt: 'desc' },
      select: { item: { select: { bookId: true } } },
    });
    const borrowed = [...new Set(loans.map((l) => l.item.bookId))];
    const profile = centroid(
      await this.vectors.vectors(borrowed.slice(0, HISTORY_SIZE)),
    );
    return profile ? this.vectors.nearest(profile, k, borrowed) : [];
  }
}
