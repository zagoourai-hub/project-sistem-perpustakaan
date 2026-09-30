import { Injectable, Logger } from '@nestjs/common';
import { unprocessable } from '../../common/errors.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { BookDraft } from './dto/book.dto.js';

interface OpenLibraryBook {
  title?: string;
  subtitle?: string;
  authors?: { name: string }[];
  publishers?: { name: string }[];
  publish_date?: string;
  number_of_pages?: number;
  subjects?: { name: string }[];
  identifiers?: { isbn_13?: string[]; isbn_10?: string[] };
  cover?: { large?: string; medium?: string };
}

const TIMEOUT_MS = 3000;

/** Prefill metadata dari Open Library. Hasil tidak disimpan (FR-B2). */
@Injectable()
export class IsbnLookupService {
  private readonly logger = new Logger(IsbnLookupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async lookup(raw: string): Promise<BookDraft & { found: boolean }> {
    const isbn = raw.replace(/[-\s]/g, '').toUpperCase();
    if (!/^(\d{13}|\d{9}[\dX])$/.test(isbn))
      throw unprocessable('ISBN_INVALID', 'ISBN tidak valid');

    const existing = await this.prisma.book.findFirst({
      where: { deletedAt: null, OR: [{ isbn13: isbn }, { isbn10: isbn }] },
      select: { id: true },
    });

    let data: OpenLibraryBook | undefined;
    try {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
        {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'User-Agent': 'Pustaka/1.0' },
        },
      );
      if (res.ok)
        data = ((await res.json()) as Record<string, OpenLibraryBook>)[
          `ISBN:${isbn}`
        ];
    } catch (e) {
      this.logger.warn(
        `Open Library gagal/timeout untuk ${isbn}: ${(e as Error).message}`,
      );
    }

    const base = {
      existingBookId: existing?.id ?? null,
      isbn13: isbn.length === 13 ? isbn : null,
      isbn10: isbn.length === 10 ? isbn : null,
    };
    if (!data) return { found: false, ...base };

    const year = Number(data.publish_date?.match(/\d{4}/)?.[0]);
    return {
      found: true,
      ...base,
      title: data.title,
      subtitle: data.subtitle ?? null,
      isbn13: data.identifiers?.isbn_13?.[0] ?? base.isbn13,
      isbn10: data.identifiers?.isbn_10?.[0] ?? base.isbn10,
      authors: data.authors?.map((a) => a.name) ?? [],
      publisher: data.publishers?.[0]?.name ?? null,
      year: Number.isFinite(year) ? year : null,
      pages: data.number_of_pages ?? null,
      subjects: data.subjects?.slice(0, 5).map((s) => s.name) ?? [],
      coverUrl: data.cover?.large ?? data.cover?.medium ?? null,
      language: null,
      synopsis: null,
    };
  }
}
