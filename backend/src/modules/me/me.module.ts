import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { FinesModule } from '../fines/fines.module.js';
import { HoldsModule } from '../holds/holds.module.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';
import { RecommendationsService } from './recommendations.service.js';

@Module({
  imports: [AiModule, FinesModule, HoldsModule],
  controllers: [MeController],
  providers: [MeService, RecommendationsService],
})
export class MeModule {}
