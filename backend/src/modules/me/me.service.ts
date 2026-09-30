import { Injectable } from '@nestjs/common';
import { notFound } from '../../common/errors.js';
import type { Pagination } from '../../common/pagination/pagination.schema.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { LoanPresenter } from '../catalog/loan.presenter.js';
import { renewReasons } from '../circulation/circulation.rules.js';
import {
  fineSelect,
  FinesService,
  presentFine,
} from '../fines/fines.service.js';
import { HoldsService } from '../holds/holds.service.js';
import { memberSelect, presentMember } from '../members/members.service.js';
import { PoliciesService } from '../policies/policies.service.js';

/** Data portal anggota — selalu dibatasi memberId milik user yang login. */
@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
    private readonly fines: FinesService,
    private readonly holds: HoldsService,
    private readonly loans: LoanPresenter,
  ) {}

  private async member(memberId: string) {
    const m = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: memberSelect,
    });
    if (!m) throw notFound('Anggota');
    return presentMember(m);
  }

  /** Kartu anggota digital: QR hanya berisi memberCode (FR-C3). */
  async card(memberId: string) {
    const m = await this.member(memberId);
    return { ...m, qrPayload: m.memberCode };
  }

  async summary(memberId: string) {
    const m = await this.member(memberId);
    const policy = await this.policies.get(m.type);
    const now = new Date();
    const [
      activeLoans,
      overdueLoans,
      readyHolds,
      waitingHolds,
      unpaidFines,
      unread,
    ] = await Promise.all([
      this.prisma.loan.count({ where: { memberId, returnedAt: null } }),
      this.prisma.loan.count({
        where: { memberId, returnedAt: null, dueAt: { lt: now } },
      }),
      this.prisma.hold.count({ where: { memberId, status: 'READY' } }),
      this.prisma.hold.count({ where: { memberId, status: 'WAITING' } }),
      this.fines.unpaidTotal(memberId),
      this.prisma.notification.count({ where: { memberId, readAt: null } }),
    ]);
    return {
      activeLoans,
      maxActiveLoans: policy.maxActiveLoans,
      overdueLoans,
      readyHolds,
      waitingHolds,
      unpaidFines,
      unreadNotifications: unread,
    };
  }

  /** Loan[] aktif + status boleh-perpanjang per pinjaman (tombol di DueSlip). */
  async activeLoans(memberId: string) {
    const m = await this.member(memberId);
    const [policy, unpaidFines, loans] = await Promise.all([
      this.policies.get(m.type),
      this.fines.unpaidTotal(memberId),
      this.loans.list({ memberId, returnedAt: null }),
    ]);
    const now = new Date();
    return loans.map((loan) => {
      const reasons = renewReasons({
        member: m,
        policy,
        unpaidFines,
        dueAt: loan.dueAt,
        renewCount: loan.renewCount,
        waitingHolds: loan.item.book.availability.holdQueue,
        now,
      });
      return {
        ...loan,
        overdue: loan.dueAt < now,
        canRenew: reasons.length === 0,
        renewBlockedReasons: reasons,
      };
    });
  }

  holdsList(memberId: string) {
    return this.holds.listForMember(memberId);
  }

  /** Fine[] milik anggota, terbaru dulu. */
  async finesList(memberId: string) {
    const rows = await this.prisma.fine.findMany({
      where: { loan: { memberId } },
      orderBy: { createdAt: 'desc' },
      select: fineSelect,
    });
    return rows.map(presentFine);
  }

  history(memberId: string, p: Pagination) {
    return this.loans.page({ memberId, returnedAt: { not: null } }, p, {
      returnedAt: 'desc',
    });
  }

  async updateSettings(memberId: string, emailReminders: boolean) {
    await this.prisma.member.update({
      where: { id: memberId },
      data: { emailReminders },
    });
    return this.member(memberId);
  }
}
