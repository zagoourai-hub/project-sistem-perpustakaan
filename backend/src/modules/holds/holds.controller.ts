import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Staff } from '../../common/decorators/roles.decorator.js';
import { unprocessable } from '../../common/errors.js';
import { type CreateHoldDto, createHoldSchema } from './dto/hold.dto.js';
import {
  type HoldQuery,
  holdQuerySchema,
  HoldsService,
} from './holds.service.js';

@Controller()
export class HoldsController {
  constructor(private readonly holds: HoldsService) {}

  /** Anggota: untuk diri sendiri. Staf: wajib isi memberId. */
  @Post('holds')
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createHoldSchema }) dto: CreateHoldDto,
  ) {
    const memberId = user.role === 'MEMBER' ? user.memberId : dto.memberId;
    if (!memberId)
      throw unprocessable('MEMBER_REQUIRED', 'memberId wajib diisi');
    return this.holds.create(user, memberId, dto.bookId);
  }

  @Delete('holds/:id')
  @HttpCode(204)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.holds.cancel(user, id);
  }

  /** Staf: ?status=READY untuk rak siap diambil; default semua yang aktif. */
  @Staff()
  @Get('holds')
  list(@Query({ schema: holdQuerySchema }) q: HoldQuery) {
    return this.holds.list(q);
  }

  @Staff()
  @Get('books/:id/holds')
  forBook(@Param('id') bookId: string) {
    return this.holds.listForBook(bookId);
  }
}
