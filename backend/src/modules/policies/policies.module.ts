import { Global, Module } from '@nestjs/common';
import { HolidaysController } from './holidays.controller.js';
import { HolidaysService } from './holidays.service.js';
import { PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';

@Global()
@Module({
  controllers: [PoliciesController, HolidaysController],
  providers: [PoliciesService, HolidaysService],
  exports: [PoliciesService, HolidaysService],
})
export class PoliciesModule {}
