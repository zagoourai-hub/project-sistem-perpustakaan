import { Injectable } from '@nestjs/common';
import {
  addDays,
  endOfLocalDay,
  toLocalDate,
} from '../../common/utils/date.util.js';
import { formatDate } from '../../common/utils/format.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PoliciesService } from '../policies/policies.service.js';
import { SettingsService } from '../settings/settings.service.js';

type Tx = Prisma.TransactionClient;

export interface Allocation {
  holdId: string;
  memberId: string;
  bookTitle: string;
  expiresAt: Date;
}

@Injectable()
export class HoldAllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Eksemplar AVAILABLE → berikan ke antrean teratas (FIFO) judul tsb:
   * hold WAITING → READY, eksemplar → ON_HOLD. Null bila tidak ada antrean.
   * Update bersyarat membuat pemanggilan paralel aman.
   */
  async allocateInTx(tx: Tx, itemId: string): Promise<Allocation | null> {
    const item = await tx.item.findUnique({
      where: { id: itemId },
      select: {
        bookId: true,
        status: true,
        deletedAt: true,
        book: { select: { title: true } },
      },
    });
    if (!item || item.status !== 'AVAILABLE' || item.deletedAt) return null;

    const hold = await tx.hold.findFirst({
      where: {
        bookId: item.bookId,
        status: 'WAITING',
        member: { status: 'ACTIVE' },
      },
      orderBy: { queuedAt: 'asc' },
      select: { id: true, memberId: true, member: { select: { type: true } } },
    });
    if (!hold) return null;

    const claimed = await tx.item.updateMany({
      where: { id: itemId, status: 'AVAILABLE' },
      data: { status: 'ON_HOLD' },
    });
    if (claimed.count === 0) return null;

    const policy = await this.policies.get(hold.member.type);
    const tz = await this.settings.timezone();
    const expiresAt = endOfLocalDay(
      addDays(toLocalDate(new Date(), tz), policy.holdPickupDays),
      tz,
    );
    const ready = await tx.hold.updateMany({
      where: { id: hold.id, status: 'WAITING' },
      data: { status: 'READY', readyAt: new Date(), expiresAt, itemId },
    });
    if (ready.count === 0) throw new Error('Hold berubah saat alokasi'); // rollback transaksi
    return {
      holdId: hold.id,
      memberId: hold.memberId,
      bookTitle: item.book.title,
      expiresAt,
    };
  }

  async notifyReady(a: Allocation | null) {
    if (!a) return;
    const tz = await this.settings.timezone();
    await this.notifications.notify(a.memberId, 'HOLD_READY', {
      title: a.bookTitle,
      expiresAt: formatDate(a.expiresAt, tz),
      message: `Reservasi siap diambil: ${a.bookTitle} (sampai ${formatDate(a.expiresAt, tz)})`,
    });
  }

  /** Versi mandiri (transaksi sendiri + notifikasi). */
  async allocate(itemId: string) {
    const a = await this.prisma.$transaction((tx) =>
      this.allocateInTx(tx, itemId),
    );
    await this.notifyReady(a);
    return a;
  }

  /** Lepas eksemplar ON_HOLD (hold batal/kedaluwarsa) lalu alokasikan ke antrean berikutnya. */
  async releaseInTx(tx: Tx, itemId: string) {
    await tx.item.updateMany({
      where: { id: itemId, status: 'ON_HOLD' },
      data: { status: 'AVAILABLE' },
    });
    return this.allocateInTx(tx, itemId);
  }
}
