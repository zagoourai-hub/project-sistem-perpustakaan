import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';

// Bentuk respons mengikuti frontend/shared/types/models.ts (BookSummary, Book, Item, ItemWithBook).

/** Field buku untuk kartu/list (OPAC, hasil pencarian, rekomendasi). */
export const bookCardSelect = {
  id: true,
  title: true,
  subtitle: true,
  year: true,
  language: true,
  callNumber: true,
  synopsis: true,
  coverKey: true,
  publisher: { select: { id: true, name: true } },
  authors: {
    select: { author: { select: { id: true, name: true } } },
    orderBy: { position: 'asc' },
  },
  subjects: { select: { subject: { select: { id: true, name: true } } } },
} as const satisfies Prisma.BookSelect;

export const bookDetailSelect = {
  ...bookCardSelect,
  isbn13: true,
  isbn10: true,
  pages: true,
  ddc: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.BookSelect;

/** Eksemplar lengkap: rak, jatuh tempo pinjaman aktif, pemilik hold READY. */
export const itemSelect = {
  id: true,
  bookId: true,
  barcode: true,
  status: true,
  condition: true,
  source: true,
  price: true,
  acquiredAt: true,
  shelfLocation: { select: { id: true, code: true, name: true } },
  loans: { where: { returnedAt: null }, select: { dueAt: true } },
  holds: { where: { status: 'READY' }, select: { memberId: true } },
} as const satisfies Prisma.ItemSelect;

type CardRow = Prisma.BookGetPayload<{ select: typeof bookCardSelect }>;
type ItemRow = Prisma.ItemGetPayload<{ select: typeof itemSelect }>;

export interface Availability {
  total: number;
  available: number;
  /** Kode rak tempat eksemplar tersedia, mis. ["B-04"]. */
  shelves: string[];
  holdQueue: number;
}

/** Eksemplar yang dihitung sebagai koleksi (bukan hilang/ditarik). */
const COUNTED: Prisma.ItemWhereInput = {
  deletedAt: null,
  status: { notIn: ['LOST', 'WITHDRAWN'] },
};

export const presentItem = ({ loans, holds, ...i }: ItemRow) => ({
  ...i,
  dueAt: loans[0]?.dueAt ?? null,
  heldForMemberId: holds[0]?.memberId ?? null,
});

@Injectable()
export class BookPresenter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  cover(coverKey: string | null) {
    return coverKey
      ? {
          small: this.storage.publicUrl(`${coverKey}-sm.webp`),
          large: this.storage.publicUrl(`${coverKey}-lg.webp`),
        }
      : null;
  }

  async availability(bookIds: string[]) {
    const [items, holds] = await Promise.all([
      this.prisma.item.findMany({
        where: { bookId: { in: bookIds }, ...COUNTED },
        select: {
          bookId: true,
          status: true,
          shelfLocation: { select: { code: true } },
        },
      }),
      this.prisma.hold.groupBy({
        by: ['bookId'],
        where: { bookId: { in: bookIds }, status: 'WAITING' },
        _count: { _all: true },
      }),
    ]);
    const map = new Map<string, Availability>(
      bookIds.map((id) => [
        id,
        { total: 0, available: 0, shelves: [], holdQueue: 0 },
      ]),
    );
    for (const i of items) {
      const a = map.get(i.bookId)!;
      a.total++;
      if (i.status !== 'AVAILABLE') continue;
      a.available++;
      const code = i.shelfLocation?.code;
      if (code && !a.shelves.includes(code)) a.shelves.push(code);
    }
    for (const h of holds) map.get(h.bookId)!.holdQueue = h._count._all;
    return map;
  }

  /** BookSummary (+ publisher, subjects, language, synopsis, cover kecil/besar). */
  present<T extends CardRow>(
    { coverKey, authors, subjects, ...b }: T,
    availability?: Availability,
  ) {
    const cover = this.cover(coverKey);
    return {
      ...b,
      coverUrl: cover?.large ?? null,
      cover,
      authors: authors.map((a) => a.author),
      subjects: subjects.map((s) => s.subject),
      availability: availability ?? {
        total: 0,
        available: 0,
        shelves: [],
        holdQueue: 0,
      },
    };
  }

  /** Bungkus banyak baris sekaligus dengan satu query ketersediaan. */
  async presentMany<T extends CardRow>(rows: T[]) {
    const avail = await this.availability(rows.map((r) => r.id));
    return rows.map((r) => this.present(r, avail.get(r.id)));
  }

  /** Kartu buku untuk daftar id, urutan dipertahankan (hasil ranking). */
  async cardsInOrder(ids: string[]) {
    const rows = await this.prisma.book.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: bookCardSelect,
    });
    const byId = new Map((await this.presentMany(rows)).map((b) => [b.id, b]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  /** ItemWithBook: eksemplar + kartu bukunya. */
  async itemsWithBook(where: Prisma.ItemWhereInput) {
    const rows = await this.prisma.item.findMany({
      where,
      orderBy: { barcode: 'asc' },
      select: { ...itemSelect, book: { select: bookCardSelect } },
    });
    const avail = await this.availability([
      ...new Set(rows.map((r) => r.bookId)),
    ]);
    return rows.map(({ book, ...item }) => ({
      ...presentItem(item),
      book: this.present(book, avail.get(book.id)),
    }));
  }
}
