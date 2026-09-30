import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Roles, Staff } from '../../common/decorators/roles.decorator.js';
import type { MemberType } from '../../generated/prisma/enums.js';
import { AuditService } from '../audit/audit.service.js';
import {
  memberTypeSchema,
  PoliciesService,
  type UpdatePolicyDto,
  updatePolicySchema,
} from './policies.service.js';

@Controller('policies')
export class PoliciesController {
  constructor(
    private readonly policies: PoliciesService,
    private readonly audit: AuditService,
  ) {}

  @Staff()
  @Get()
  list() {
    return this.policies.list();
  }

  @Roles('ADMIN')
  @Put(':memberType')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('memberType', { schema: memberTypeSchema }) memberType: MemberType,
    @Body({ schema: updatePolicySchema }) dto: UpdatePolicyDto,
  ) {
    const policy = await this.policies.update(memberType, dto);
    await this.audit.log({
      actorId: user.id,
      action: 'policy.update',
      entityType: 'LoanPolicy',
      entityId: policy.id,
      metadata: dto,
    });
    return policy;
  }
}
