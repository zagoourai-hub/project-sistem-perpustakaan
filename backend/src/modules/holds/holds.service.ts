import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import {
  AppException,
  conflict,
  notFound,
  unprocessable,
} from '../../common/errors.js';
import {
  Page,
  paginationSchema,
  skipTake,
} from '../../common/pagination/pagination.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { HoldStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { BookPresenter } from '../catalog/book.presenter.js';
import { PoliciesService } from '../policies/policies.service.js';
import { HoldAllocationService } from './hold-allocation.service.js';

const ACTIVE: HoldStatus[] = ['WAITING', 'READY'];

export const holdQuerySchema = paginationSchema.extend({
  status: z.enum(HoldStatus).optional(),
  // cari judul / nama anggota / kode anggota
  q: z.string().trim().optional(),
  bookId: z.string().optional(),
});
export type HoldQuery = z.infer<typeof holdQuerySchema>;

const holdSelect = {
  id: true,
  bookId: true,
  memberId: true,
  status: true,
  queuedAt: true,
  readyAt: true,
  expiresAt: true,
  item: { select: { id: true, barcode: true } },
  member: {
    select: {
      id: true,
      memberCode: true,
      classOrMajor: true,
      user: { select: { name: true } },
    },
  },
} as const satisfies Prisma.HoldSelect;

type HoldRow = Prisma.HoldGetPayload<{ select: typeof holdSelect }>;

@Injectable()
export class HoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
    private readonly allocation: HoldAllocationService,
    private readonly audit: AuditService,
    private readonly books: BookPresenter,
  ) {}

  /**
   * Bentuk Hold frontend: { id, book: BookSummary, memberId, status, queuedAt, readyAt,
   * expiresAt, queuePosition } + item & member (untuk staf).
   */
  private async present(rows: HoldRow[]) {
    const cards = new Map(
      (
        await this.books.cardsInOrder([...new Set(rows.map((r) => r.bookId))])
      ).map((b) => [b.id, b]),
    );
    return Promise.all(
      rows.map(async ({ bookId, member, ...h }) => ({
        ...h,
        book: cards.get(bookId)!,
        member: {
          id: member.id,
          memberCode: member.memberCode,
          name: member.user.name,
          classOrMajor: member.classOrMajor,
        },
        queuePosition:
          h.status === 'WAITING' ? await this.position(h.id) : null,
      })),
    );
  }

  /** FR-G1: reservasi judul hanya bila tidak ada eksemplar AVAILABLE. */
  async create(actor: AuthUser, memberId: string, bookId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw notFound('Anggota');
    if (member.status !== 'ACTIVE') {
      throw unprocessable(
        'MEMBER_NOT_ACTIVE',
        'Keanggotaan tidak aktif, tidak bisa reservasi',
      );
    }
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, deletedAt: null },
    });
    if (!book) throw notFound('Buku');

    const [available, borrowable, sameHold, sameLoan, activeHolds, policy] =
      await Promise.all([
        this.prisma.item.count({
          where: { bookId, deletedAt: null, status: 'AVAILABLE' },
        }),
        this.prisma.item.count({
          where: {
            bookId,
            deletedAt: null,
            status: { in: ['ON_LOAN', 'ON_HOLD', 'IN_REPAIR', 'DAMAGED'] },
          },
        }),
        this.prisma.hold.count({
          where: { memberId, bookId, status: { in: ACTIVE } },
        }),
        this.prisma.loan.count({
          where: { memberId, returnedAt: null, item: { bookId } },
        }),
        this.prisma.hold.count({ where: { memberId, status: { in: ACTIVE } } }),
        this.policies.get(member.type),
      ]);
    if (available > 0) {
      throw unprocessable(
        'ITEMS_AVAILABLE',
        'Masih ada eksemplar tersedia, silakan pinjam langsung di rak',
      );
    }
    if (borrowable === 0)
      throw unprocessable(
        'NO_ITEMS',
        'Judul ini belum punya eksemplar yang bisa dipinjam',
      );
    if (sameHold)
      throw conflict('ALREADY_HELD', 'Anda sudah mereservasi judul ini');
    if (sameLoan)
      throw conflict('ALREADY_BORROWED', 'Anda sedang meminjam judul ini');
    if (activeHolds >= policy.maxActiveHolds) {
      throw unprocessable(
        'HOLD_LIMIT',
        `Maksimal ${policy.maxActiveHolds} reservasi aktif`,
      );
    }

    const hold = await this.prisma.hold.create({
      data: { bookId, memberId },
      select: holdSelect,
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'hold.create',
      entityType: 'Hold',
      entityId: hold.id,
      metadata: { bookId, memberId },
    });
    const [presented] = await this.present([hold]);
    return presented;
  }

  /** FR-G4: anggota batal sendiri; staf boleh membatalkan milik siapa pun. */
  async cancel(actor: AuthUser, id: string) {
    const hold = await this.prisma.hold.findUnique({ where: { id } });
    if (!hold) throw notFound('Reservasi');
    if (actor.role === 'MEMBER' && hold.memberId !== actor.memberId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bukan reservasi Anda',
      );
    }
    if (!ACTIVE.includes(hold.status)) {
      throw conflict('HOLD_NOT_ACTIVE', 'Reservasi sudah tidak aktif');
    }
    const next = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.hold.updateMany({
        where: { id, status: hold.status },
        data: { status: 'CANCELLED' },
      });
      if (count === 0)
        throw conflict('HOLD_CHANGED', 'Reservasi baru saja berubah');
      await this.audit.log(
        {
          actorId: actor.id,
          action: 'hold.cancel',
          entityType: 'Hold',
          entityId: id,
        },
        tx,
      );
      return hold.status === 'READY' && hold.itemId
        ? this.allocation.releaseInTx(tx, hold.itemId)
        : null;
    });
    await this.allocation.notifyReady(next);
  }

  /** Posisi antrean (1 = berikutnya). Null untuk hold yang tidak WAITING. */
  async position(holdId: string) {
    const hold = await this.prisma.hold.findUnique({ where: { id: holdId } });
    if (!hold || hold.status !== 'WAITING') return null;
    return (
      (await this.prisma.hold.count({
        where: {
          bookId: hold.bookId,
          status: 'WAITING',
          queuedAt: { lt: hold.queuedAt },
        },
      })) + 1
    );
  }

  async listForMember(memberId: string) {
    return this.present(
      await this.prisma.hold.findMany({
        where: { memberId, status: { in: ACTIVE } },
        orderBy: { queuedAt: 'asc' },
        select: holdSelect,
      }),
    );
  }

  /** Antrean per judul (staf). */
  async listForBook(bookId: string) {
    return this.present(
      await this.prisma.hold.findMany({
        where: { bookId, status: { in: ACTIVE } },
        orderBy: { queuedAt: 'asc' },
        select: holdSelect,
      }),
    );
  }

  /** Daftar staf: default reservasi aktif; READY diurutkan batas ambil terdekat. */
  async list(q: HoldQuery) {
    const where: Prisma.HoldWhereInput = {
      status: q.status ?? { in: ACTIVE },
      bookId: q.bookId,
      OR: q.q
        ? [
            { book: { title: { contains: q.q, mode: 'insensitive' } } },
            {
              member: {
                user: { name: { contains: q.q, mode: 'insensitive' } },
              },
            },
            { member: { memberCode: { contains: q.q.toUpperCase() } } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.hold.findMany({
        where,
        orderBy:
          q.status === 'READY' ? { expiresAt: 'asc' } : { queuedAt: 'asc' },
        select: holdSelect,
        ...skipTake(q),
      }),
      this.prisma.hold.count({ where }),
    ]);
    return new Page(await this.present(rows), {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.ceil(total / q.pageSize),
    });
  }
}
