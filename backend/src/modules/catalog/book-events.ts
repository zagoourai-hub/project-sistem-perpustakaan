import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { QUEUES } from '../../infra/queue/queue.module.js';

export const EMBEDDING_JOBS = {
  upsert: 'book.upserted',
  delete: 'book.deleted',
} as const;
export interface BookJobData {
  bookId: string;
}

/** Perubahan katalog → antrean embeddings (dikonsumsi module ai). */
@Injectable()
export class BookEvents {
  constructor(
    @InjectQueue(QUEUES.embeddings) private readonly queue: Queue<BookJobData>,
  ) {}

  upserted(bookId: string) {
    return this.queue.add(
      EMBEDDING_JOBS.upsert,
      { bookId },
      {
        // edit beruntun dalam 10 detik cukup di-embed sekali
        deduplication: { id: `upsert:${bookId}`, ttl: 10_000 },
        delay: 2_000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    );
  }

  deleted(bookId: string) {
    return this.queue.add(EMBEDDING_JOBS.delete, { bookId }, { attempts: 3 });
  }
}
