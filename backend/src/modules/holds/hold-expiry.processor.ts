import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { QUEUES } from '../../infra/queue/queue.module.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { HoldAllocationService } from './hold-allocation.service.js';

/** Tiap 15 menit: hold READY lewat batas ambil → EXPIRED, eksemplar ke antrean berikutnya. */
@Processor(QUEUES.holds)
export class HoldExpiryProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(HoldExpiryProcessor.name);

  constructor(
    @InjectQueue(QUEUES.holds) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly allocation: HoldAllocationService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'expire-holds',
      { every: 15 * 60_000 },
      { name: 'expire-holds' },
    );
  }

  async process() {
    const expired = await this.prisma.hold.findMany({
      where: { status: 'READY', expiresAt: { lt: new Date() } },
      select: {
        id: true,
        memberId: true,
        itemId: true,
        book: { select: { title: true } },
      },
    });
    for (const hold of expired) {
      const next = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.hold.updateMany({
          where: { id: hold.id, status: 'READY' },
          data: { status: 'EXPIRED' },
        });
        if (count === 0 || !hold.itemId) return null;
        return this.allocation.releaseInTx(tx, hold.itemId);
      });
      await this.notifications.notify(hold.memberId, 'HOLD_EXPIRED', {
        title: hold.book.title,
        message: `Reservasi kedaluwarsa: ${hold.book.title}`,
        dedupeKey: `HOLD_EXPIRED:${hold.id}`,
      });
      await this.allocation.notifyReady(next);
    }
    if (expired.length)
      this.logger.log(`${expired.length} reservasi kedaluwarsa`);
    return { expired: expired.length };
  }
}
