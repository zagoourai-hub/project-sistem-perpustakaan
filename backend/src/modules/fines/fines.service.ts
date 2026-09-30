import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { conflict, notFound, unprocessable } from '../../common/errors.js';
import {
  paginate,
  paginationSchema,
} from '../../common/pagination/pagination.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { FineStatus, FineType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { HolidaysService } from '../policies/holidays.service.js';
import { PoliciesService } from '../policies/policies.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { outstanding, overdueFine } from './fine.calculator.js';

export const fineQuerySchema = paginationSchema.extend({
  status: z.enum(FineStatus).optional(),
  type: z.enum(FineType).optional(),
  memberId: z.string().optional(),
  // cari nama anggota, kode anggota, judul, atau barcode
  q: z.string().trim().optional(),
});
export type FineQuery = z.infer<typeof fineQuerySchema>;

export const paymentSchema = z.object({
  amount: z.coerce.number().int().min(1),
});
export const waiveSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const fineSelect = {
  id: true,
  type: true,
  amount: true,
  paidAmount: true,
  status: true,
  waivedReason: true,
  createdAt: true,
  updatedAt: true,
  loan: {
    select: {
      id: true,
      checkedOutAt: true,
      dueAt: true,
      returnedAt: true,
      item: {
        select: { barcode: true, book: { select: { id: true, title: true } } },
      },
      member: {
        select: {
          id: true,
          memberCode: true,
          classOrMajor: true,
          user: { select: { name: true } },
        },
      },
    },
  },
  payments: {
    select: { id: true, amount: true, paidAt: true, receivedById: true },
    orderBy: { paidAt: 'asc' },
  },
} as const satisfies Prisma.FineSelect;

type FineRow = Prisma.FineGetPayload<{ select: typeof fineSelect }>;
/** Bentuk Fine frontend: datar dengan member & book, plus outstanding, loan & payments. */
export const presentFine = ({ loan, ...f }: FineRow) => ({
  ...f,
  loanId: loan.id,
  outstanding: outstanding(f),
  member: loan.member
    ? {
        id: loan.member.id,
        memberCode: loan.member.memberCode,
        name: loan.member.user.name,
        classOrMajor: loan.member.classOrMajor,
      }
    : null,
  book: loan.item.book,
  loan: {
    id: loan.id,
    checkedOutAt: loan.checkedOutAt,
    dueAt: loan.dueAt,
    returnedAt: loan.returnedAt,
    barcode: loan.item.barcode,
  },
});

type Tx = Prisma.TransactionClient;

@Injectable()
export class FinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
    private readonly holidays: HolidaysService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  list(q: FineQuery) {
    const where: Prisma.FineWhereInput = {
      status: q.status,
      type: q.type,
      loan: {
        memberId: q.memberId,
        OR: q.q
          ? [
              {
                member: {
                  user: { name: { contains: q.q, mode: 'insensitive' } },
                },
              },
              { member: { memberCode: { contains: q.q.toUpperCase() } } },
              { item: { barcode: { contains: q.q.toUpperCase() } } },
              {
                item: {
                  book: { title: { contains: q.q, mode: 'insensitive' } },
                },
              },
            ]
          : undefined,
      },
    };
    return paginate(
      q,
      async (p) =>
        (
          await this.prisma.fine.findMany({
            where,
            select: fineSelect,
            orderBy: { createdAt: 'desc' },
            ...p,
          })
        ).map(presentFine),
      () => this.prisma.fine.count({ where }),
    );
  }

  async get(id: string) {
    const f = await this.prisma.fine.findUnique({
      where: { id },
      select: fineSelect,
    });
    if (!f) throw notFound('Denda');
    return presentFine(f);
  }

  /**
   * Hitung ulang denda keterlambatan satu pinjaman (saat checkin atau job harian).
   * Denda yang sudah WAIVED/PAID penuh tidak diubah.
   */
  async upsertOverdueFine(
    tx: Tx,
    loan: { id: string; dueAt: Date; memberType: 'STUDENT' | 'STAFF' },
    at: Date,
  ) {
    const policy = await this.policies.get(loan.memberType);
    const { days, amount } = overdueFine({
      dueAt: loan.dueAt,
      at,
      finePerDay: policy.finePerDay,
      maxFinePerLoan: policy.maxFinePerLoan,
      holidays: await this.holidays.set(),
      tz: await this.settings.timezone(),
    });
    if (amount <= 0) return null;
    const existing = await tx.fine.findUnique({
      where: { loanId_type: { loanId: loan.id, type: 'OVERDUE' } },
    });
    if (
      existing &&
      (existing.status === 'WAIVED' || existing.amount === amount)
    )
      return { fine: existing, days, created: false };
    const fine = existing
      ? await tx.fine.update({
          where: { id: existing.id },
          data: {
            amount,
            status: existing.paidAmount >= amount ? 'PAID' : 'UNPAID',
          },
        })
      : await tx.fine.create({
          data: { loanId: loan.id, type: 'OVERDUE', amount },
        });
    return { fine, days, created: !existing };
  }

  /** Pembayaran tunai di meja, parsial didukung (FR-F2). */
  /** Balikan FinePayment { id, fineId, amount, receivedBy, paidAt } + denda terbaru. */
  async pay(actorId: string, id: string, amount: number) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const fine = await tx.fine.findUnique({ where: { id } });
      if (!fine) throw notFound('Denda');
      if (fine.status !== 'UNPAID')
        throw conflict('FINE_CLOSED', 'Denda sudah lunas atau dihapuskan');
      const remaining = fine.amount - fine.paidAmount;
      if (amount > remaining) {
        throw unprocessable(
          'AMOUNT_EXCEEDS',
          `Nominal melebihi sisa tagihan (${remaining})`,
        );
      }
      const paidAmount = fine.paidAmount + amount;
      // update bersyarat: pembayaran ganda paralel tidak melebihi tagihan
      const { count } = await tx.fine.updateMany({
        where: { id, paidAmount: fine.paidAmount, status: 'UNPAID' },
        data: {
          paidAmount,
          status: paidAmount >= fine.amount ? 'PAID' : 'UNPAID',
        },
      });
      if (count === 0)
        throw conflict('FINE_CHANGED', 'Denda baru saja berubah, muat ulang');
      const created = await tx.finePayment.create({
        data: { fineId: id, amount, receivedById: actorId },
      });
      await this.audit.log(
        {
          actorId,
          action: 'fine.pay',
          entityType: 'Fine',
          entityId: id,
          metadata: { amount },
        },
        tx,
      );
      return created;
    });
    const staff = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    const { receivedById: _, ...rest } = payment;
    return { ...rest, receivedBy: staff?.name ?? '', fine: await this.get(id) };
  }

  /** FR-F3: hanya ADMIN, wajib alasan. */
  async waive(actorId: string, id: string, reason: string) {
    const { count } = await this.prisma.fine.updateMany({
      where: { id, status: 'UNPAID' },
      data: { status: 'WAIVED', waivedReason: reason, waivedById: actorId },
    });
    if (count === 0) {
      await this.get(id); // 404 bila tidak ada
      throw conflict('FINE_CLOSED', 'Denda sudah lunas atau dihapuskan');
    }
    await this.audit.log({
      actorId,
      action: 'fine.waive',
      entityType: 'Fine',
      entityId: id,
      metadata: { reason },
    });
    return this.get(id);
  }

  /** Total tagihan belum lunas anggota (untuk blokir peminjaman). */
  async unpaidTotal(memberId: string, db: Pick<Tx, 'fine'> = this.prisma) {
    const agg = await db.fine.aggregate({
      where: { loan: { memberId }, status: 'UNPAID' },
      _sum: { amount: true, paidAmount: true },
    });
    return (agg._sum.amount ?? 0) - (agg._sum.paidAmount ?? 0);
  }
}
