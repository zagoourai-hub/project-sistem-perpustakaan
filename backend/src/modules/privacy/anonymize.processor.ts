import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { DAILY_AT, QUEUES } from '../../infra/queue/queue.module.js';
import { AuditService } from '../audit/audit.service.js';
import { SettingsService } from '../settings/settings.service.js';

/**
 * Retensi UU PDP: riwayat pinjam anggota yang sudah keluar (EXPIRED) lebih dari
 * N tahun (setting historyRetentionYears, default 2) dilepas dari anggotanya.
 * Statistik sirkulasi tetap utuh karena baris Loan tidak dihapus.
 */
@Processor(QUEUES.privacy)
export class AnonymizeProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AnonymizeProcessor.name);

  constructor(
    @InjectQueue(QUEUES.privacy) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'anonymize-history',
      DAILY_AT(2, await this.settings.timezone()),
      {
        name: 'anonymize-history',
      },
    );
  }

  async process() {
    const { historyRetentionYears } = await this.settings.get();
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - historyRetentionYears);
    const { count } = await this.prisma.loan.updateMany({
      where: {
        returnedAt: { not: null },
        member: { status: 'EXPIRED', validUntil: { lt: cutoff } },
        // denda yang belum selesai tetap terikat ke anggota
        fines: { none: { status: 'UNPAID' } },
      },
      data: { memberId: null },
    });
    if (count) {
      await this.audit.log({
        action: 'privacy.anonymize_history',
        entityType: 'Loan',
        metadata: { loans: count, cutoff: cutoff.toISOString() },
      });
      this.logger.log(`${count} riwayat pinjam dianonimkan`);
    }
    return { anonymized: count };
  }
}
