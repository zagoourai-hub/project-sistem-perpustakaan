import { Module } from '@nestjs/common';
import { HoldsModule } from '../holds/holds.module.js';
import { BarcodeService } from './barcode.service.js';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';

@Module({
  imports: [HoldsModule],
  controllers: [ItemsController],
  providers: [ItemsService, BarcodeService],
})
export class ItemsModule {}
