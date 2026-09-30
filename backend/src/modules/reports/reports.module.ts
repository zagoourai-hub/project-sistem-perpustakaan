import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { ExportService } from './export.service.js';
import { ReportsController } from './reports.controller.js';

@Module({
  controllers: [ReportsController],
  providers: [DashboardService, ExportService],
})
export class ReportsModule {}
