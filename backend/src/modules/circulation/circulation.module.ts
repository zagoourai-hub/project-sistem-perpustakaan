import { Module } from '@nestjs/common';
import { FinesModule } from '../fines/fines.module.js';
import { HoldsModule } from '../holds/holds.module.js';
import { CheckinService } from './checkin.service.js';
import { CheckoutService } from './checkout.service.js';
import { CirculationController } from './circulation.controller.js';
import { LostDamagedService } from './lost-damaged.service.js';
import { RenewService } from './renew.service.js';

@Module({
  imports: [FinesModule, HoldsModule],
  controllers: [CirculationController],
  providers: [
    CheckoutService,
    CheckinService,
    RenewService,
    LostDamagedService,
  ],
  exports: [RenewService],
})
export class CirculationModule {}
