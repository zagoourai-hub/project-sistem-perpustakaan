import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  type Pagination,
  paginationSchema,
} from '../../common/pagination/pagination.schema.js';
import { MeService } from './me.service.js';
import { RecommendationsService } from './recommendations.service.js';

const preferencesSchema = z.object({ emailReminders: z.boolean() });

/** Portal anggota: hanya data milik sendiri (memberId dari token, bukan dari request). */
@Roles('MEMBER')
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly recommendations: RecommendationsService,
  ) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.me.summary(user.memberId!);
  }

  @Get('card')
  card(@CurrentUser() user: AuthUser) {
    return this.me.card(user.memberId!);
  }

  @Get('loans')
  loans(@CurrentUser() user: AuthUser) {
    return this.me.activeLoans(user.memberId!);
  }

  @Get('holds')
  holds(@CurrentUser() user: AuthUser) {
    return this.me.holdsList(user.memberId!);
  }

  @Get('fines')
  fines(@CurrentUser() user: AuthUser) {
    return this.me.finesList(user.memberId!);
  }

  @Get('history')
  history(
    @CurrentUser() user: AuthUser,
    @Query({ schema: paginationSchema }) p: Pagination,
  ) {
    return this.me.history(user.memberId!, p);
  }

  @Get('recommendations')
  recommend(@CurrentUser() user: AuthUser) {
    return this.recommendations.forMember(user.memberId!);
  }

  /** Preferensi anggota (FR-J4) → Member. */
  @Patch('settings')
  settings(
    @CurrentUser() user: AuthUser,
    @Body({ schema: preferencesSchema }) dto: z.infer<typeof preferencesSchema>,
  ) {
    return this.me.updateSettings(user.memberId!, dto.emailReminders);
  }
}
