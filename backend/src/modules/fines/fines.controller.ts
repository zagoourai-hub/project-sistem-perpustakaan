import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Roles, Staff } from '../../common/decorators/roles.decorator.js';
import {
  type FineQuery,
  fineQuerySchema,
  FinesService,
  paymentSchema,
  waiveSchema,
} from './fines.service.js';

@Controller('fines')
export class FinesController {
  constructor(private readonly fines: FinesService) {}

  @Staff()
  @Get()
  list(@Query({ schema: fineQuerySchema }) q: FineQuery) {
    return this.fines.list(q);
  }

  @Staff()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.fines.get(id);
  }

  @Staff()
  @Post(':id/payments')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: paymentSchema }) dto: z.infer<typeof paymentSchema>,
  ) {
    return this.fines.pay(user.id, id, dto.amount);
  }

  @Roles('ADMIN')
  @Post(':id/waive')
  waive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: waiveSchema }) dto: z.infer<typeof waiveSchema>,
  ) {
    return this.fines.waive(user.id, id, dto.reason);
  }
}
