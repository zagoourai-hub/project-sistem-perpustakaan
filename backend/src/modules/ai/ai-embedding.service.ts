import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { buildBookDocument } from './document-builder.js';
import { OpenRouterClient } from './openrouter.client.js';
import { VectorRepository } from './vector.repository.js';

@Injectable()
export class AiEmbeddingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openrouter: OpenRouterClient,
    private readonly vectors: VectorRepository,
  ) {}

  /** Embed ulang judul yang kontennya berubah (hash beda). Mengembalikan jumlah yang di-embed. */
  async upsertBooks(bookIds: string[]) {
    const books = await this.prisma.book.findMany({
      where: { id: { in: bookIds }, deletedAt: null },
      select: {
        id: true,
        title: true,
        subtitle: true,
        synopsis: true,
        authors: {
          select: { author: { select: { name: true } } },
          orderBy: { position: 'asc' },
        },
        subjects: { select: { subject: { select: { name: true } } } },
      },
    });
    const hashes = await this.vectors.hashes(books.map((b) => b.id));
    const pending = books
      .map((b) => ({
        id: b.id,
        ...buildBookDocument(
          {
            title: b.title,
            subtitle: b.subtitle,
            synopsis: b.synopsis,
            authors: b.authors.map((a) => a.author.name),
            subjects: b.subjects.map((s) => s.subject.name),
          },
          this.openrouter.model,
        ),
      }))
      .filter((d) => hashes.get(d.id) !== d.contentHash);
    if (!pending.length) return 0;

    const embeddings = await this.openrouter.embed(pending.map((d) => d.text));
    for (const [i, d] of pending.entries()) {
      await this.vectors.upsert(
        d.id,
        embeddings[i],
        this.openrouter.model,
        d.contentHash,
      );
    }
    return pending.length;
  }

  delete(bookId: string) {
    return this.vectors.delete(bookId);
  }
}
