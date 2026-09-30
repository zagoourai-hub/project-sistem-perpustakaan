import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema.js';

export const QUEUES = {
  mail: 'mail',
  fines: 'fines',
  holds: 'holds',
  embeddings: 'embeddings',
  members: 'members',
  reminders: 'reminders',
  privacy: 'privacy',
} as const;

/** Cron harian/jam-an memakai BullMQ job scheduler (idempoten, aman di-restart). */
export const DAILY_AT = (hour: number, tz: string) => ({
  pattern: `0 ${hour} * * *`,
  tz,
});

const queues = BullModule.registerQueue(
  ...Object.values(QUEUES).map((name) => ({
    name,
    defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 5000 },
  })),
);

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = new URL(config.get('REDIS_URL', { infer: true }));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
            db: Number(url.pathname.slice(1) || 0),
          },
        };
      },
    }),
    queues,
  ],
  exports: [queues],
})
export class QueueModule {}
