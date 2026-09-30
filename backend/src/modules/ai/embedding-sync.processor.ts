import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUES } from '../../infra/queue/queue.module.js';
import { type BookJobData, EMBEDDING_JOBS } from '../catalog/book-events.js';
import { AiEmbeddingService } from './ai-embedding.service.js';
import { OpenRouterClient } from './openrouter.client.js';
import {
  REINDEX_JOB,
  type ReindexJobData,
  ReindexService,
} from './reindex.service.js';

@Processor(QUEUES.embeddings, { concurrency: 2 })
export class EmbeddingSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingSyncProcessor.name);

  constructor(
    private readonly embeddings: AiEmbeddingService,
    private readonly openrouter: OpenRouterClient,
    private readonly reindex: ReindexService,
  ) {
    super();
  }

  async process(job: Job<BookJobData | ReindexJobData>) {
    switch (job.name) {
      case EMBEDDING_JOBS.delete:
        await this.embeddings.delete((job.data as BookJobData).bookId);
        return;
      case EMBEDDING_JOBS.upsert:
        // AI mati: lewati, backfill lewat reindex setelah key diisi
        if (!this.openrouter.enabled) return;
        await this.embeddings.upsertBooks([(job.data as BookJobData).bookId]);
        return;
      case REINDEX_JOB: {
        const { bookIds } = job.data as ReindexJobData;
        try {
          const n = await this.embeddings.upsertBooks(bookIds);
          await this.reindex.progress(bookIds.length);
          return { embedded: n };
        } catch (e) {
          if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1))
            await this.reindex.progress(0, bookIds.length);
          this.logger.warn(`Reindex batch gagal: ${(e as Error).message}`);
          throw e;
        }
      }
    }
  }
}
