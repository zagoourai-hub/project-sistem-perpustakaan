import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { notFound } from '../../common/errors.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { NotificationType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { QUEUES } from '../../infra/queue/queue.module.js';

const TITLES: Record<NotificationType, string> = {
  CHECKOUT_CONFIRMATION: 'Peminjaman tercatat',
  DUE_REMINDER: 'Pengingat jatuh tempo',
  OVERDUE: 'Buku terlambat',
  HOLD_READY: 'Reservasi siap diambil',
  HOLD_EXPIRED: 'Reservasi kedaluwarsa',
  FINE_ISSUED: 'Denda tercatat',
};

export interface MailJobData {
  notificationId: string;
}

/** Payload notifikasi: data template email + `message` untuk lonceng in-app. */
export type NotificationPayload = Record<string, Prisma.InputJsonValue> & {
  message: string;
  // mencegah notifikasi ganda dari job yang berjalan ulang
  dedupeKey?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.mail) private readonly mail: Queue<MailJobData>,
  ) {}

  async notify(
    memberId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ) {
    if (payload.dedupeKey) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          memberId,
          type,
          payload: { path: ['dedupeKey'], equals: payload.dedupeKey },
        },
        select: { id: true },
      });
      if (exists) return null;
    }
    const n = await this.prisma.notification.create({
      data: { memberId, type, payload },
    });
    await this.mail.add(
      'send',
      { notificationId: n.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 30_000 } },
    );
    return n;
  }

  /** Lonceng portal: Notification[] { id, type, title, body, readAt, createdAt }, 50 terbaru. */
  async list(memberId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        payload: true,
        createdAt: true,
        readAt: true,
      },
    });
    return rows.map(({ payload, ...n }) => ({
      ...n,
      title: TITLES[n.type],
      body: (payload as { message?: string }).message ?? '',
    }));
  }

  unreadCount(memberId: string) {
    return this.prisma.notification.count({
      where: { memberId, readAt: null },
    });
  }

  async markRead(memberId: string, id: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, memberId, readAt: null },
      data: { readAt: new Date() },
    });
    if (
      count === 0 &&
      !(await this.prisma.notification.findFirst({ where: { id, memberId } }))
    ) {
      throw notFound('Notifikasi');
    }
  }

  markAllRead(memberId: string) {
    return this.prisma.notification.updateMany({
      where: { memberId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
