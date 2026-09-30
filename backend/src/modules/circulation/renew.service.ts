import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import {
  AppException,
  conflict,
  notFound,
  unprocessable,
} from '../../common/errors.js';
import { computeDueAt } from '../../common/utils/date.util.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { FinesService } from '../fines/fines.service.js';
import { HolidaysService } from '../policies/holidays.service.js';
import { PoliciesService } from '../policies/policies.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { renewReasons } from './circulation.rules.js';
import { LoanPresenter } from '../catalog/loan.presenter.js';

@Injectable()
export class RenewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
    private readonly holidays: HolidaysService,
    private readonly settings: SettingsService,
    private readonly fines: FinesService,
    private readonly audit: AuditService,
    private readonly loans: LoanPresenter,
  ) {}

  /** Oleh pustakawan atau anggota sendiri dari portal (FR-E3). Jatuh tempo baru dihitung dari jatuh tempo lama. */
  async renew(actor: AuthUser, loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        dueAt: true,
        returnedAt: true,
        renewCount: true,
        item: { select: { bookId: true, book: { select: { title: true } } } },
        member: {
          select: { id: true, type: true, status: true, validUntil: true },
        },
      },
    });
    if (!loan || !loan.member) throw notFound('Pinjaman');
    if (actor.role === 'MEMBER' && actor.memberId !== loan.member.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bukan pinjaman Anda',
      );
    }
    if (loan.returnedAt)
      throw conflict('LOAN_CLOSED', 'Pinjaman sudah dikembalikan');

    const now = new Date();
    const [policy, waitingHolds, unpaidFines] = await Promise.all([
      this.policies.get(loan.member.type),
      this.prisma.hold.count({
        where: { bookId: loan.item.bookId, status: 'WAITING' },
      }),
      this.fines.unpaidTotal(loan.member.id),
    ]);
    const reasons = renewReasons({
      member: loan.member,
      policy,
      unpaidFines,
      dueAt: loan.dueAt,
      renewCount: loan.renewCount,
      waitingHolds,
      now,
    });
    if (reasons.length)
      throw unprocessable('RENEW_REJECTED', reasons[0].message, reasons);

    const dueAt = computeDueAt(
      loan.dueAt,
      policy.loanDays,
      await this.holidays.set(),
      await this.settings.timezone(),
    );
    const { count } = await this.prisma.loan.updateMany({
      where: { id: loanId, returnedAt: null, renewCount: loan.renewCount },
      data: { dueAt, renewCount: { increment: 1 } },
    });
    if (count === 0)
      throw conflict('LOAN_CHANGED', 'Pinjaman baru saja berubah');
    await this.audit.log({
      actorId: actor.id,
      action: 'circulation.renew',
      entityType: 'Loan',
      entityId: loanId,
      metadata: { from: loan.dueAt.toISOString(), to: dueAt.toISOString() },
    });
    return this.loans.one(loanId);
  }
}
