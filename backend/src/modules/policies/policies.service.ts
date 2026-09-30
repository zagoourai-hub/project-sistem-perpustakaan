import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { notFound } from '../../common/errors.js';
import type { LoanPolicy } from '../../generated/prisma/client.js';
import { MemberType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

const nonNeg = z.number().int().min(0);
export const updatePolicySchema = z
  .object({
    maxActiveLoans: nonNeg,
    loanDays: z.number().int().min(1).max(365),
    maxRenewals: nonNeg,
    finePerDay: nonNeg,
    maxFinePerLoan: nonNeg,
    blockingFineThreshold: nonNeg,
    holdPickupDays: z.number().int().min(1).max(30),
    maxActiveHolds: nonNeg,
  })
  .partial();
export type UpdatePolicyDto = z.infer<typeof updatePolicySchema>;
export const memberTypeSchema = z.enum(MemberType);

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.loanPolicy.findMany({ orderBy: { memberType: 'asc' } });
  }

  async get(memberType: MemberType): Promise<LoanPolicy> {
    const policy = await this.prisma.loanPolicy.findUnique({
      where: { memberType },
    });
    if (!policy) throw notFound(`Kebijakan pinjam ${memberType}`);
    return policy;
  }

  update(memberType: MemberType, dto: UpdatePolicyDto) {
    return this.prisma.loanPolicy.update({ where: { memberType }, data: dto });
  }
}
