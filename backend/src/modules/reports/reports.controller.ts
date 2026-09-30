import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Staff } from '../../common/decorators/roles.decorator.js';
import {
  addDays,
  startOfLocalDay,
  toLocalDate,
} from '../../common/utils/date.util.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { DashboardService } from './dashboard.service.js';
import { ExportService } from './export.service.js';
import { REPORT_TYPES, REPORTS, type ReportType } from './report-queries.js';

// Periode: default bulan berjalan. from/to = tanggal lokal inklusif (YYYY-MM-DD).
const rangeSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});
type RangeQuery = z.infer<typeof rangeSchema>;
const exportSchema = rangeSchema.extend({
  format: z.enum(['xlsx', 'csv']).default('xlsx'),
});
const typeSchema = z.enum(REPORT_TYPES);

@Controller()
export class ReportsController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly exporter: ExportService,
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get('opac/home')
  opac() {
    return this.dashboard.opac();
  }

  @Staff()
  @Get('reports/dashboard')
  staff() {
    return this.dashboard.staff();
  }

  @Staff()
  @Get('reports/types')
  types() {
    return REPORT_TYPES;
  }

  @Staff()
  @Get('reports/:type')
  async report(
    @Param('type', { schema: typeSchema }) type: ReportType,
    @Query({ schema: rangeSchema }) q: RangeQuery,
  ) {
    const { range, period } = await this.range(q);
    return { type, period, ...(await REPORTS[type](this.prisma, range)) };
  }

  /** Export XLSX/CSV; tercatat di audit log karena bisa memuat data pribadi (UU PDP). */
  @Staff()
  @Get('reports/:type/export')
  async export(
    @CurrentUser() user: AuthUser,
    @Param('type', { schema: typeSchema }) type: ReportType,
    @Query({ schema: exportSchema }) q: z.infer<typeof exportSchema>,
    @Res() res: Response,
  ) {
    const { range, period } = await this.range({
      ...q,
      limit: Math.max(q.limit, 1000),
    });
    const report = await REPORTS[type](this.prisma, range);
    const file = `laporan-${type}-${period.from}_${period.to}.${q.format}`;
    const body =
      q.format === 'csv'
        ? this.exporter.csv(report, range.tz)
        : await this.exporter.xlsx(
            report,
            `Periode ${period.from} s/d ${period.to}`,
            range.tz,
          );
    await this.audit.log({
      actorId: user.id,
      action: 'report.export',
      entityType: 'Report',
      entityId: type,
      metadata: { ...period, format: q.format, rows: report.rows.length },
    });
    res
      .status(200)
      .set({
        'Content-Type':
          q.format === 'csv'
            ? 'text/csv; charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${file}"`,
      })
      .send(body);
  }

  private async range(q: RangeQuery) {
    const tz = await this.settings.timezone();
    const today = toLocalDate(new Date(), tz);
    const from = q.from ?? `${today.slice(0, 8)}01`;
    const to = q.to ?? today;
    return {
      period: { from, to },
      range: {
        from: startOfLocalDay(from, tz),
        to: startOfLocalDay(addDays(to, 1), tz),
        tz,
        limit: q.limit,
      },
    };
  }
}
