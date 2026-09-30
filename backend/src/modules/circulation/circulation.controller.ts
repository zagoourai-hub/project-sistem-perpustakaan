import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Staff } from '../../common/decorators/roles.decorator.js';
import {
  paginate,
  paginationSchema,
} from '../../common/pagination/pagination.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { CheckinService } from './checkin.service.js';
import { CheckoutService } from './checkout.service.js';
import {
  type CheckinDto,
  checkinSchema,
  type MarkLostDto,
  markLostSchema,
} from './dto/checkin.dto.js';
import { type CheckoutDto, checkoutSchema } from './dto/checkout.dto.js';
import { LostDamagedService } from './lost-damaged.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { formatDate } from '../../common/utils/format.util.js';
import { conflict, notFound } from '../../common/errors.js';
import { RenewService } from './renew.service.js';
import { HolidaysService } from '../policies/holidays.service.js';
import { lateDays } from '../../common/utils/date.util.js';

const loanQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'overdue', 'returned']).default('active'),
  memberId: z.string().optional(),
  q: z.string().trim().optional(),
});
type LoanQuery = z.infer<typeof loanQuerySchema>;

@Controller()
export class CirculationController {
  constructor(
    private readonly checkouts: CheckoutService,
    private readonly checkins: CheckinService,
    private readonly renews: RenewService,
    private readonly lost: LostDamagedService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly holidays: HolidaysService,
  ) {}

  /** Validasi tiap scan tanpa menyimpan apa pun. */
  @Staff()
  @Post('circulation/checkout/preview')
  @HttpCode(200)
  preview(@Body({ schema: checkoutSchema }) dto: CheckoutDto) {
    return this.checkouts.preview(dto);
  }

  @Staff()
  @Post('circulation/checkout')
  checkout(
    @CurrentUser() user: AuthUser,
    @Body({ schema: checkoutSchema }) dto: CheckoutDto,
    @Req() req: Request,
  ) {
    return this.checkouts.checkout(user.id, dto, req.ip);
  }

  @Staff()
  @Post('circulation/checkin')
  @HttpCode(200)
  checkin(
    @CurrentUser() user: AuthUser,
    @Body({ schema: checkinSchema }) dto: CheckinDto,
    @Req() req: Request,
  ) {
    return this.checkins.checkin(user.id, dto.barcode, req.ip);
  }

  @Staff()
  @Get('loans')
  list(@Query({ schema: loanQuerySchema }) q: LoanQuery) {
    const now = new Date();
    const where: Prisma.LoanWhereInput = {
      memberId: q.memberId,
      ...(q.status === 'returned'
        ? { returnedAt: { not: null } }
        : {
            returnedAt: null,
            dueAt: q.status === 'overdue' ? { lt: now } : undefined,
          }),
      OR: q.q
        ? [
            { item: { barcode: { contains: q.q.toUpperCase() } } },
            {
              item: { book: { title: { contains: q.q, mode: 'insensitive' } } },
            },
            {
              member: {
                user: { name: { contains: q.q, mode: 'insensitive' } },
              },
            },
          ]
        : undefined,
    };
    return paginate(
      q,
      (p) =>
        this.prisma.loan.findMany({
          where,
          orderBy:
            q.status === 'returned' ? { returnedAt: 'desc' } : { dueAt: 'asc' },
          select: {
            id: true,
            checkedOutAt: true,
            dueAt: true,
            returnedAt: true,
            renewCount: true,
            item: {
              select: {
                id: true,
                barcode: true,
                book: { select: { id: true, title: true } },
              },
            },
            member: {
              select: {
                id: true,
                memberCode: true,
                user: { select: { name: true } },
              },
            },
          },
          ...p,
        }),
      () => this.prisma.loan.count({ where }),
    );
  }

  /** Pustakawan atau anggota pemilik pinjaman. */
  @Post('loans/:id/renew')
  @HttpCode(200)
  renew(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.renews.renew(user, id);
  }

  @Staff()
  @Post('loans/:id/mark-lost')
  @HttpCode(200)
  markLost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: markLostSchema }) dto: MarkLostDto,
  ) {
    return this.lost.mark(user.id, id, dto);
  }

  /** Tombol "Ingatkan" di dasbor: kirim ulang email keterlambatan untuk satu pinjaman. */
  @Staff()
  @Post('loans/:id/remind')
  @HttpCode(202)
  async remind(@Param('id') id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      select: {
        memberId: true,
        dueAt: true,
        returnedAt: true,
        item: { select: { book: { select: { title: true } } } },
      },
    });
    if (!loan?.memberId) throw notFound('Pinjaman');
    if (loan.returnedAt)
      throw conflict('LOAN_CLOSED', 'Pinjaman sudah dikembalikan');
    const tz = await this.settings.timezone();
    // Sama dengan denda & email harian: hari kalender sejak jatuh tempo, hari libur tidak dihitung.
    const days = Math.max(
      1,
      lateDays(loan.dueAt, new Date(), await this.holidays.set(), tz),
    );
    await this.notifications.notify(loan.memberId, 'OVERDUE', {
      days,
      items: [
        { title: loan.item.book.title, dueAt: formatDate(loan.dueAt, tz) },
      ],
      message: `Pengingat: ${loan.item.book.title} jatuh tempo ${formatDate(loan.dueAt, tz)}`,
    });
    return { queued: true };
  }
}
