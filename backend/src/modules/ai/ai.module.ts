import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiEmbeddingService } from './ai-embedding.service.js';
import { AiRecommendService } from './ai-recommend.service.js';
import { AiSearchService } from './ai-search.service.js';
import { EmbeddingSyncProcessor } from './embedding-sync.processor.js';
import { OpenRouterClient } from './openrouter.client.js';
import { ReindexService } from './reindex.service.js';
import { VectorRepository } from './vector.repository.js';

@Module({
  controllers: [AiController],
  providers: [
    OpenRouterClient,
    VectorRepository,
    AiEmbeddingService,
    AiSearchService,
    AiRecommendService,
    ReindexService,
    EmbeddingSyncProcessor,
  ],
  exports: [AiSearchService, AiRecommendService],
})
export class AiModule {}
