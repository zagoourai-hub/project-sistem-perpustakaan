import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../../common/errors.js';
import { paginate } from '../../common/pagination/pagination.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  bookCardSelect,
  bookDetailSelect,
  BookPresenter,
  itemSelect,
  presentItem,
} from './book.presenter.js';
import { BookEvents } from './book-events.js';
import type {
  BookQuery,
  CreateBookDto,
  UpdateBookDto,
} from './dto/book.dto.js';

type Db = Prisma.TransactionClient;

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presenter: BookPresenter,
    private readonly events: BookEvents,
    private readonly audit: AuditService,
  ) {}

  /** List katalog sederhana (console staf). Pencarian relevansi ada di /search. */
  async list(q: BookQuery) {
    const where: Prisma.BookWhereInput = {
      deletedAt: null,
      subjects: q.subjectId
        ? { some: { subjectId: q.subjectId } }
        : q.subject
          ? { some: { subject: { name: q.subject } } }
          : undefined,
      OR: q.q
        ? [
            { title: { contains: q.q, mode: 'insensitive' } },
            { isbn13: q.q.replace(/-/g, '') },
            { callNumber: { startsWith: q.q, mode: 'insensitive' } },
            {
              authors: {
                some: {
                  author: { name: { contains: q.q, mode: 'insensitive' } },
                },
              },
            },
          ]
        : undefined,
    };
    return paginate(
      q,
      async (p) =>
        this.presenter.presentMany(
          await this.prisma.book.findMany({
            where,
            select: bookCardSelect,
            orderBy:
              q.sort === 'title' ? { title: 'asc' } : { createdAt: 'desc' },
            ...p,
          }),
        ),
      () => this.prisma.book.count({ where }),
    );
  }

  /** Detail + ketersediaan per eksemplar + lokasi rak + panjang antrean reservasi. */
  async get(id: string) {
    const book = await this.prisma.book.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...bookDetailSelect,
        items: {
          where: { deletedAt: null, status: { not: 'WITHDRAWN' } },
          orderBy: { barcode: 'asc' },
          select: itemSelect,
        },
      },
    });
    if (!book) throw notFound('Buku');
    const { items, ...rest } = book;
    const avail = await this.presenter.availability([id]);
    return {
      ...this.presenter.present(rest, avail.get(id)),
      items: items.map(presentItem),
    };
  }

  async create(actorId: string, dto: CreateBookDto) {
    const id = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.create({
        data: { ...(await this.bookData(tx, dto)), title: dto.title },
        select: { id: true },
      });
      await this.setRelations(tx, book.id, dto);
      await this.audit.log(
        {
          actorId,
          action: 'book.create',
          entityType: 'Book',
          entityId: book.id,
        },
        tx,
      );
      return book.id;
    });
    await this.events.upserted(id);
    return this.get(id);
  }

  async update(actorId: string, id: string, dto: UpdateBookDto) {
    await this.assertExists(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id },
        data: await this.bookData(tx, dto),
      });
      await this.setRelations(tx, id, dto);
      await this.audit.log(
        {
          actorId,
          action: 'book.update',
          entityType: 'Book',
          entityId: id,
          metadata: { fields: Object.keys(dto) },
        },
        tx,
      );
    });
    await this.events.upserted(id);
    return this.get(id);
  }

  /** Soft delete; ditolak bila ada eksemplar sedang dipinjam (FR-B8). */
  async remove(actorId: string, id: string) {
    await this.assertExists(id);
    const activeLoans = await this.prisma.loan.count({
      where: { returnedAt: null, item: { bookId: id } },
    });
    if (activeLoans > 0) {
      throw conflict(
        'BOOK_HAS_ACTIVE_LOANS',
        `Masih ada ${activeLoans} eksemplar yang dipinjam`,
      );
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.book.update({ where: { id }, data: { deletedAt: now } });
      await tx.item.updateMany({
        where: { bookId: id, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.hold.updateMany({
        where: { bookId: id, status: { in: ['WAITING', 'READY'] } },
        data: { status: 'CANCELLED' },
      });
      await this.audit.log(
        { actorId, action: 'book.delete', entityType: 'Book', entityId: id },
        tx,
      );
    });
    await this.events.deleted(id);
  }

  async assertExists(id: string) {
    const b = await this.prisma.book.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!b) throw notFound('Buku');
  }

  private async bookData(tx: Db, dto: UpdateBookDto) {
    const { publisher, authors: _a, subjects: _s, ...fields } = dto;
    return {
      ...fields,
      publisherId:
        publisher === undefined
          ? undefined
          : publisher === null
            ? null
            : (
                await tx.publisher.upsert({
                  where: { name: publisher },
                  create: { name: publisher },
                  update: {},
                })
              ).id,
    };
  }

  private async setRelations(tx: Db, bookId: string, dto: UpdateBookDto) {
    if (dto.authors) {
      await tx.bookAuthor.deleteMany({ where: { bookId } });
      const unique = [...new Set(dto.authors)];
      for (const [position, name] of unique.entries()) {
        const a = await tx.author.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        await tx.bookAuthor.create({
          data: { bookId, authorId: a.id, position },
        });
      }
    }
    if (dto.subjects) {
      await tx.bookSubject.deleteMany({ where: { bookId } });
      for (const name of new Set(dto.subjects)) {
        const s = await tx.subject.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        await tx.bookSubject.create({ data: { bookId, subjectId: s.id } });
      }
    }
  }
}
