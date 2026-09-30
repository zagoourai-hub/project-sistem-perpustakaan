import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { DAILY_AT, QUEUES } from '../../infra/queue/queue.module.js';
import { SettingsService } from '../settings/settings.service.js';
import { FinesService } from './fines.service.js';

/** Job harian 00:30: perbarui denda berjalan untuk pinjaman overdue (FR-F1). Idempoten. */
@Processor(QUEUES.fines)
export class OverdueFinesProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(OverdueFinesProcessor.name);

  constructor(
    @InjectQueue(QUEUES.fines) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly fines: FinesService,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'overdue-fines',
      DAILY_AT(0, await this.settings.timezone()),
      {
        name: 'overdue-fines',
      },
    );
  }

  async process() {
    const now = new Date();
    const loans = await this.prisma.loan.findMany({
      where: { returnedAt: null, dueAt: { lt: now }, member: { isNot: null } },
      select: { id: true, dueAt: true, member: { select: { type: true } } },
    });
    let updated = 0;
    for (const loan of loans) {
      const r = await this.prisma.$transaction((tx) =>
        this.fines.upsertOverdueFine(
          tx,
          { id: loan.id, dueAt: loan.dueAt, memberType: loan.member!.type },
          now,
        ),
      );
      if (r) updated++;
    }
    this.logger.log(`Denda berjalan diperbarui untuk ${updated} pinjaman`);
    return { updated };
  }
}
