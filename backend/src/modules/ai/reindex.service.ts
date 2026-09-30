import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { conflict } from '../../common/errors.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { QUEUES } from '../../infra/queue/queue.module.js';
import { InjectRedis } from '../../infra/redis/redis.module.js';
import { OpenRouterClient } from './openrouter.client.js';
import { VectorRepository } from './vector.repository.js';

export const REINDEX_JOB = 'reindex-batch';
const KEY = 'ai:reindex';
const CHUNK = 50;

export interface ReindexJobData {
  bookIds: string[];
}

/** Backfill embedding seluruh katalog (FR-L5), progress di Redis. */
@Injectable()
export class ReindexService {
  constructor(
    @InjectQueue(QUEUES.embeddings)
    private readonly queue: Queue<ReindexJobData>,
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly openrouter: OpenRouterClient,
    private readonly vectors: VectorRepository,
  ) {}

  async start() {
    if (!this.openrouter.enabled) {
      throw conflict('AI_DISABLED', 'OPENROUTER_API_KEY belum dikonfigurasi');
    }
    const current = await this.redis.hgetall(KEY);
    if (
      current.status === 'running' &&
      Number(current.done) < Number(current.total)
    ) {
      throw conflict('REINDEX_RUNNING', 'Reindex sedang berjalan');
    }
    const books = await this.prisma.book.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    await this.redis.hset(KEY, {
      status: 'running',
      total: books.length,
      done: 0,
      failed: 0,
      startedAt: new Date().toISOString(),
    });
    for (let i = 0; i < books.length; i += CHUNK) {
      await this.queue.add(
        REINDEX_JOB,
        { bookIds: books.slice(i, i + CHUNK).map((b) => b.id) },
        { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } },
      );
    }
    return this.status();
  }

  async progress(done: number, failed = 0) {
    const m = this.redis.multi().hincrby(KEY, 'done', done);
    if (failed) m.hincrby(KEY, 'failed', failed);
    await m.exec();
    const s = await this.redis.hgetall(KEY);
    if (Number(s.done) + Number(s.failed ?? 0) >= Number(s.total)) {
      await this.redis.hset(KEY, {
        status: 'finished',
        finishedAt: new Date().toISOString(),
      });
    }
  }

  async status() {
    const s = await this.redis.hgetall(KEY);
    const coverage = await this.vectors.stats();
    const running = s.status === 'running';
    // AiIndexStatus frontend: { embedded, total, model, reindexing, progress } + detail
    return {
      embedded: coverage.embedded,
      total: coverage.total,
      model: this.openrouter.model,
      reindexing: running,
      progress:
        running && Number(s.total) > 0
          ? Math.round(
              ((Number(s.done) + Number(s.failed ?? 0)) / Number(s.total)) *
                100,
            )
          : null,
      enabled: this.openrouter.enabled,
      reindex: s.status
        ? {
            status: s.status,
            total: Number(s.total),
            done: Number(s.done),
            failed: Number(s.failed ?? 0),
            startedAt: s.startedAt,
            finishedAt: s.finishedAt ?? null,
          }
        : null,
    };
  }
}
