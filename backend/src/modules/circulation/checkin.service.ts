import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../../common/errors.js';
import { formatDate, formatRupiah } from '../../common/utils/format.util.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { FinesService } from '../fines/fines.service.js';
import { HoldAllocationService } from '../holds/hold-allocation.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { LoanPresenter } from '../catalog/loan.presenter.js';

@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fines: FinesService,
    private readonly holds: HoldAllocationService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly loans: LoanPresenter,
  ) {}

  /** FR-E2: scan eksemplar → tutup pinjaman → denda → antrean reservasi → ON_HOLD/AVAILABLE. */
  async checkin(actorId: string, barcode: string, ip?: string) {
    const item = await this.prisma.item.findUnique({
      where: { barcode },
      select: {
        id: true,
        status: true,
        book: { select: { id: true, title: true } },
      },
    });
    if (!item) throw notFound('Eksemplar');
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findFirst({
        where: { itemId: item.id, returnedAt: null },
        select: {
          id: true,
          dueAt: true,
          checkedOutAt: true,
          member: {
            select: {
              id: true,
              memberCode: true,
              type: true,
              classOrMajor: true,
              user: { select: { name: true } },
            },
          },
        },
      });
      if (!loan)
        throw conflict(
          'NO_ACTIVE_LOAN',
          `Eksemplar ${barcode} tidak sedang dipinjam`,
        );

      const closed = await tx.loan.updateMany({
        where: { id: loan.id, returnedAt: null },
        data: { returnedAt: now, checkedInById: actorId },
      });
      if (closed.count === 0)
        throw conflict('ALREADY_RETURNED', 'Eksemplar baru saja dikembalikan');

      const fine = loan.member
        ? await this.fines.upsertOverdueFine(
            tx,
            { id: loan.id, dueAt: loan.dueAt, memberType: loan.member.type },
            now,
          )
        : null;

      await tx.item.updateMany({
        where: { id: item.id, status: 'ON_LOAN' },
        data: { status: 'AVAILABLE' },
      });
      const allocation = await this.holds.allocateInTx(tx, item.id);

      await this.audit.log(
        {
          actorId,
          action: 'circulation.checkin',
          entityType: 'Loan',
          entityId: loan.id,
          metadata: {
            barcode,
            fine: fine?.fine.amount ?? 0,
            heldFor: allocation?.memberId ?? null,
          },
          ip,
        },
        tx,
      );
      return { loan, fine, allocation };
    });

    const tz = await this.settings.timezone();
    await this.holds.notifyReady(result.allocation);
    if (
      result.fine &&
      result.loan.member &&
      result.fine.fine.status === 'UNPAID'
    ) {
      await this.notifications.notify(result.loan.member.id, 'FINE_ISSUED', {
        title: item.book.title,
        amount: formatRupiah(result.fine.fine.amount),
        reason: `terlambat ${result.fine.days} hari`,
        message: `Denda ${formatRupiah(result.fine.fine.amount)} untuk ${item.book.title}`,
        dedupeKey: `FINE_ISSUED:${result.fine.fine.id}:${result.fine.fine.amount}`,
      });
    }

    const heldMember = result.allocation
      ? await this.prisma.member.findUnique({
          where: { id: result.allocation.memberId },
          select: {
            id: true,
            memberCode: true,
            classOrMajor: true,
            user: { select: { name: true } },
          },
        })
      : null;
    const loan = await this.loans.one(result.loan.id);

    // Bentuk CheckinResult frontend (+ field tambahan itemStatus, fineDays).
    return {
      loan,
      member: result.loan.member
        ? {
            id: result.loan.member.id,
            memberCode: result.loan.member.memberCode,
            name: result.loan.member.user.name,
            classOrMajor: result.loan.member.classOrMajor,
          }
        : null,
      fine: result.fine ? await this.fines.get(result.fine.fine.id) : null,
      fineDays: result.fine?.days ?? 0,
      // ON_HOLD: taruh di rak reservasi untuk anggota ini
      itemStatus: result.allocation ? 'ON_HOLD' : 'AVAILABLE',
      heldFor:
        result.allocation && heldMember
          ? {
              id: result.allocation.holdId,
              expiresAt: result.allocation.expiresAt,
              expiresAtLabel: formatDate(result.allocation.expiresAt, tz),
              memberId: heldMember.id,
              memberCode: heldMember.memberCode,
              memberName: heldMember.user.name,
              classOrMajor: heldMember.classOrMajor,
            }
          : null,
      // kembali ke rak asal eksemplar (null bila disimpan untuk reservasi)
      returnToShelf: result.allocation
        ? null
        : (loan.item.shelfLocation?.code ?? null),
    };
  }
}
