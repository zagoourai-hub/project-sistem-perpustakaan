import { Injectable } from '@nestjs/common';
import { notFound, unprocessable } from '../../common/errors.js';
import { computeDueAt } from '../../common/utils/date.util.js';
import { formatDate } from '../../common/utils/format.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { LoanPresenter } from '../catalog/loan.presenter.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { FinesService } from '../fines/fines.service.js';
import {
  type Allocation,
  HoldAllocationService,
} from '../holds/hold-allocation.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { HolidaysService } from '../policies/holidays.service.js';
import { PoliciesService } from '../policies/policies.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  type CheckoutEvaluation,
  evaluateCheckout,
} from './circulation.rules.js';
import type { CheckoutDto } from './dto/checkout.dto.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
    private readonly holidays: HolidaysService,
    private readonly settings: SettingsService,
    private readonly fines: FinesService,
    private readonly holds: HoldAllocationService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly loans: LoanPresenter,
  ) {}

  /** Validasi tanpa mutasi — dipanggil setiap scan di meja layanan. */
  async preview(dto: CheckoutDto) {
    const ctx = await this.evaluate(this.prisma, dto);
    const dueAt = computeDueAt(
      new Date(),
      ctx.policy.loanDays,
      await this.holidays.set(),
      await this.settings.timezone(),
    );
    return {
      ...ctx.evaluation,
      dueAt,
      items: ctx.evaluation.items.map((i) => ({
        ...i,
        book: ctx.books.get(i.barcode) ?? null,
      })),
    };
  }

  /**
   * FR-E1 batch: blokir level anggota (status, denda) → 422. Per eksemplar: yang lolos
   * dipinjam, yang gagal (status, kuota, kalah balapan dengan meja lain) masuk `rejected`.
   */
  async checkout(actorId: string, dto: CheckoutDto, ip?: string) {
    const now = new Date();
    const tz = await this.settings.timezone();
    const holidays = await this.holidays.set();
    const released: (Allocation | null)[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = await this.evaluate(tx, dto, true);
      const blockers = ctx.evaluation.member.filter(
        (r) => r.code !== 'LOAN_LIMIT',
      );
      if (blockers.length) {
        throw unprocessable(
          'CHECKOUT_REJECTED',
          `Peminjaman ditolak: ${blockers.map((r) => r.message).join(', ')}`,
          { member: blockers },
        );
      }
      const dueAt = computeDueAt(now, ctx.policy.loanDays, holidays, tz);
      let quota = Math.max(0, ctx.policy.maxActiveLoans - ctx.activeLoans);
      const loanIds: string[] = [];
      const titles: { title: string; barcode: string }[] = [];
      const rejected: { barcode: string; reasons: string[] }[] = [];

      for (const [i, { barcode, item }] of ctx.items.entries()) {
        const reasons = ctx.evaluation.items[i].reasons.map((r) => r.message);
        if (!reasons.length && quota === 0) {
          reasons.push(`Kuota pinjam penuh (${ctx.policy.maxActiveLoans})`);
        }
        if (reasons.length) {
          rejected.push({ barcode, reasons });
          continue;
        }
        const it = item!;
        // update bersyarat = pengaman race condition antar meja layanan (FR-E5)
        const { count } = await tx.item.updateMany({
          where: { id: it.id, status: it.status },
          data: { status: 'ON_LOAN' },
        });
        if (count === 0) {
          rejected.push({
            barcode,
            reasons: ['Eksemplar baru saja dipinjam di meja lain'],
          });
          continue;
        }
        quota--;
        const loan = await tx.loan.create({
          data: {
            itemId: it.id,
            memberId: ctx.member.id,
            dueAt,
            checkedOutAt: now,
            checkedOutById: actorId,
          },
          select: { id: true },
        });
        // reservasi anggota ini atas judul yang sama terpenuhi
        const ownHolds = await tx.hold.findMany({
          where: {
            memberId: ctx.member.id,
            bookId: it.bookId,
            status: { in: ['WAITING', 'READY'] },
          },
        });
        for (const h of ownHolds) {
          await tx.hold.update({
            where: { id: h.id },
            data: { status: 'FULFILLED', itemId: it.id },
          });
          // hold READY dengan eksemplar lain → eksemplar itu dilepas ke antrean berikutnya
          if (h.status === 'READY' && h.itemId && h.itemId !== it.id) {
            released.push(await this.holds.releaseInTx(tx, h.itemId));
          }
        }
        await this.audit.log(
          {
            actorId,
            action: 'circulation.checkout',
            entityType: 'Loan',
            entityId: loan.id,
            metadata: { barcode, memberId: ctx.member.id },
            ip,
          },
          tx,
        );
        loanIds.push(loan.id);
        titles.push({ title: it.book.title, barcode });
      }
      return { memberId: ctx.member.id, loanIds, titles, dueAt, rejected };
    });

    for (const a of released) await this.holds.notifyReady(a);
    if (result.loanIds.length) {
      await this.notifications.notify(
        result.memberId,
        'CHECKOUT_CONFIRMATION',
        {
          items: result.titles.map((t) => ({
            ...t,
            dueAt: formatDate(result.dueAt, tz),
          })),
          message: `Meminjam ${result.loanIds.length} buku, kembali ${formatDate(result.dueAt, tz)}`,
        },
      );
    }
    return {
      loans: await this.loans.list({ id: { in: result.loanIds } }),
      rejected: result.rejected,
    };
  }

  private async evaluate(
    db: Tx | PrismaService,
    dto: CheckoutDto,
    lock = false,
  ) {
    const code = dto.memberCode.trim();
    const member = await db.member.findFirst({
      where: { OR: [{ memberCode: code.toUpperCase() }, { idNumber: code }] },
      select: {
        id: true,
        memberCode: true,
        type: true,
        status: true,
        validUntil: true,
        user: { select: { name: true } },
      },
    });
    if (!member) throw notFound('Anggota');
    if (lock) {
      // serialisasi checkout paralel untuk anggota yang sama (kuota)
      await db.$queryRaw`SELECT 1 FROM "Member" WHERE id = ${member.id} FOR UPDATE`;
    }

    const [policy, activeLoans, unpaidFines, rows] = await Promise.all([
      this.policies.get(member.type),
      db.loan.count({ where: { memberId: member.id, returnedAt: null } }),
      this.fines.unpaidTotal(member.id, db),
      db.item.findMany({
        where: { barcode: { in: dto.barcodes } },
        select: {
          id: true,
          bookId: true,
          barcode: true,
          status: true,
          deletedAt: true,
          book: { select: { id: true, title: true, callNumber: true } },
          holds: { where: { status: 'READY' }, select: { memberId: true } },
        },
      }),
    ]);
    const byBarcode = new Map(rows.map((r) => [r.barcode, r]));
    const items = dto.barcodes.map((barcode) => ({
      barcode,
      item: byBarcode.get(barcode) ?? null,
    }));
    const evaluation: CheckoutEvaluation = evaluateCheckout({
      member: {
        id: member.id,
        status: member.status,
        validUntil: member.validUntil,
      },
      policy,
      activeLoans,
      unpaidFines,
      now: new Date(),
      items: items.map(({ barcode, item }) => ({
        barcode,
        item: item && {
          barcode,
          status: item.status,
          deleted: !!item.deletedAt,
          heldForMemberId: item.holds[0]?.memberId ?? null,
        },
      })),
    });
    const books = new Map(rows.map((r) => [r.barcode, r.book]));
    return {
      member: { ...member, name: member.user.name },
      policy,
      items,
      evaluation,
      books,
      unpaidFines,
      activeLoans,
    };
  }
}
