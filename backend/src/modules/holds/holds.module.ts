import { Module } from '@nestjs/common';
import { HoldAllocationService } from './hold-allocation.service.js';
import { HoldExpiryProcessor } from './hold-expiry.processor.js';
import { HoldsController } from './holds.controller.js';
import { HoldsService } from './holds.service.js';

@Module({
  controllers: [HoldsController],
  providers: [HoldsService, HoldAllocationService, HoldExpiryProcessor],
  exports: [HoldsService, HoldAllocationService],
})
export class HoldsModule {}
