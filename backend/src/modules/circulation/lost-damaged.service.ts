import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../../common/errors.js';
import { formatRupiah } from '../../common/utils/format.util.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { FinesService } from '../fines/fines.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { MarkLostDto } from './dto/checkin.dto.js';

@Injectable()
export class LostDamagedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fines: FinesService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** FR-E4: tutup pinjaman, eksemplar LOST/DAMAGED, denda penggantian (default harga eksemplar). */
  async mark(actorId: string, loanId: string, dto: MarkLostDto) {
    const now = new Date();
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        dueAt: true,
        returnedAt: true,
        itemId: true,
        item: { select: { price: true, book: { select: { title: true } } } },
        member: { select: { id: true, type: true } },
      },
    });
    if (!loan) throw notFound('Pinjaman');
    if (loan.returnedAt)
      throw conflict('LOAN_CLOSED', 'Pinjaman sudah ditutup');
    const amount = dto.amount ?? loan.item.price ?? 0;

    const fine = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.loan.updateMany({
        where: { id: loanId, returnedAt: null },
        data: { returnedAt: now, checkedInById: actorId },
      });
      if (count === 0) throw conflict('LOAN_CLOSED', 'Pinjaman sudah ditutup');
      await tx.item.updateMany({
        where: { id: loan.itemId, status: 'ON_LOAN' },
        data: { status: dto.type },
      });
      if (loan.member) {
        await this.fines.upsertOverdueFine(
          tx,
          { id: loan.id, dueAt: loan.dueAt, memberType: loan.member.type },
          now,
        );
      }
      const created =
        amount > 0
          ? await tx.fine.create({ data: { loanId, type: dto.type, amount } })
          : null;
      await this.audit.log(
        {
          actorId,
          action:
            dto.type === 'LOST'
              ? 'circulation.mark_lost'
              : 'circulation.mark_damaged',
          entityType: 'Loan',
          entityId: loanId,
          metadata: { amount, note: dto.note ?? null },
        },
        tx,
      );
      return created;
    });

    if (fine && loan.member) {
      await this.notifications.notify(loan.member.id, 'FINE_ISSUED', {
        title: loan.item.book.title,
        amount: formatRupiah(amount),
        reason: dto.type === 'LOST' ? 'buku hilang' : 'buku rusak',
        message: `Denda penggantian ${formatRupiah(amount)} untuk ${loan.item.book.title}`,
      });
    }
    // Fine frontend; null bila nominal penggantian 0
    return fine ? this.fines.get(fine.id) : null;
  }
}
