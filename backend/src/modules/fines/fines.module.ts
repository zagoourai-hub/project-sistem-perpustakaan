import { Module } from '@nestjs/common';
import { FinesController } from './fines.controller.js';
import { FinesService } from './fines.service.js';
import { OverdueFinesProcessor } from './overdue-fines.processor.js';

@Module({
  controllers: [FinesController],
  providers: [FinesService, OverdueFinesProcessor],
  exports: [FinesService],
})
export class FinesModule {}
