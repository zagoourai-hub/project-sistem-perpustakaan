import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { FulltextRepository } from './fulltext.repository.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SemanticSearchAdapter } from './semantic-search.adapter.js';

@Module({
  imports: [AiModule],
  controllers: [SearchController],
  providers: [SearchService, FulltextRepository, SemanticSearchAdapter],
  exports: [SearchService],
})
export class SearchModule {}
