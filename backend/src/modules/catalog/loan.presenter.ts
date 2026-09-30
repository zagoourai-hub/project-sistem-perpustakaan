import { Injectable } from '@nestjs/common';
import {
  paginate,
  type Pagination,
} from '../../common/pagination/pagination.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { PoliciesService } from '../policies/policies.service.js';
import { BookPresenter } from './book.presenter.js';

const loanSelect = {
  id: true,
  itemId: true,
  memberId: true,
  checkedOutAt: true,
  dueAt: true,
  returnedAt: true,
  renewCount: true,
  member: { select: { type: true } },
  fines: {
    where: { type: 'OVERDUE' },
    select: { amount: true, paidAmount: true, status: true },
  },
} as const satisfies Prisma.LoanSelect;

type LoanRow = Prisma.LoanGetPayload<{ select: typeof loanSelect }>;

/**
 * Bentuk `Loan` frontend: { id, item: ItemWithBook, memberId, checkedOutAt, dueAt,
 * returnedAt, renewCount, maxRenewals, accruedFine }.
 */
@Injectable()
export class LoanPresenter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly books: BookPresenter,
    private readonly policies: PoliciesService,
  ) {}

  async list(
    where: Prisma.LoanWhereInput,
    orderBy: Prisma.LoanOrderByWithRelationInput = { dueAt: 'asc' },
  ) {
    return this.present(
      await this.prisma.loan.findMany({ where, orderBy, select: loanSelect }),
    );
  }

  page(
    where: Prisma.LoanWhereInput,
    p: Pagination,
    orderBy: Prisma.LoanOrderByWithRelationInput,
  ) {
    return paginate(
      p,
      async (args) =>
        this.present(
          await this.prisma.loan.findMany({
            where,
            orderBy,
            select: loanSelect,
            ...args,
          }),
        ),
      () => this.prisma.loan.count({ where }),
    );
  }

  async one(id: string) {
    const [loan] = await this.list({ id });
    return loan;
  }

  private async present(rows: LoanRow[]) {
    if (!rows.length) return [];
    const [items, policies] = await Promise.all([
      this.books.itemsWithBook({
        id: { in: [...new Set(rows.map((r) => r.itemId))] },
      }),
      this.policies.list(),
    ]);
    const itemById = new Map(items.map((i) => [i.id, i]));
    const maxRenewals = new Map(
      policies.map((p) => [p.memberType, p.maxRenewals]),
    );
    return rows.map(({ itemId, member, fines, ...loan }) => {
      const overdue = fines[0];
      return {
        ...loan,
        item: itemById.get(itemId)!,
        maxRenewals: member ? (maxRenewals.get(member.type) ?? 0) : 0,
        accruedFine:
          overdue && overdue.status === 'UNPAID'
            ? overdue.amount - overdue.paidAmount
            : 0,
      };
    });
  }
}
