import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { dbDate, type LocalDate } from '../../common/utils/date.util.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export const createHolidaySchema = z.object({
  date: z.iso.date(),
  name: z.string().trim().min(1).max(120),
});
export type CreateHolidayDto = z.infer<typeof createHolidaySchema>;

export const holidayQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

@Injectable()
export class HolidaysService {
  private cache?: Set<LocalDate>;

  constructor(private readonly prisma: PrismaService) {}

  list(year?: number) {
    return this.prisma.holiday.findMany({
      where: year
        ? {
            date: {
              gte: new Date(`${year}-01-01`),
              lte: new Date(`${year}-12-31`),
            },
          }
        : undefined,
      orderBy: { date: 'asc' },
    });
  }

  async create(dto: CreateHolidayDto) {
    const row = await this.prisma.holiday.create({
      data: { date: new Date(dto.date), name: dto.name },
    });
    this.cache = undefined;
    return row;
  }

  async remove(id: string) {
    await this.prisma.holiday.delete({ where: { id } });
    this.cache = undefined;
  }

  /** Set tanggal libur (YYYY-MM-DD) untuk kalkulasi jatuh tempo & denda. */
  async set(): Promise<ReadonlySet<LocalDate>> {
    // ponytail: cache per proses; invalidasi hanya lewat service ini (single instance)
    if (!this.cache) {
      const rows = await this.prisma.holiday.findMany({
        select: { date: true },
      });
      this.cache = new Set(rows.map((r) => dbDate(r.date)));
    }
    return this.cache;
  }
}
