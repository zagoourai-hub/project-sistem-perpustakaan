import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  addDays,
  endOfLocalDay,
  lateDays,
  toLocalDate,
} from '../../common/utils/date.util.js';
import { formatDate } from '../../common/utils/format.util.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { DAILY_AT, QUEUES } from '../../infra/queue/queue.module.js';
import { SettingsService } from '../settings/settings.service.js';
import { NotificationsService } from './notifications.service.js';

const OVERDUE_DAYS = new Set([1, 3, 7]);

/** Job harian 07:00: reminder H-2 dan keterlambatan hari ke-1, 3, 7. */
@Processor(QUEUES.reminders)
export class DueReminderProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DueReminderProcessor.name);

  constructor(
    @InjectQueue(QUEUES.reminders) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'due-reminders',
      DAILY_AT(7, await this.settings.timezone()),
      {
        name: 'due-reminders',
      },
    );
  }

  async process() {
    const tz = await this.settings.timezone();
    const now = new Date();
    const today = toLocalDate(now, tz);
    const reminderDate = addDays(today, 2);

    const loans = await this.prisma.loan.findMany({
      where: {
        returnedAt: null,
        memberId: { not: null },
        dueAt: { lte: endOfLocalDay(reminderDate, tz) },
      },
      select: {
        memberId: true,
        dueAt: true,
        item: { select: { book: { select: { title: true } } } },
      },
    });

    // kelompokkan per anggota + jenis agar satu email berisi beberapa buku
    const groups = new Map<
      string,
      {
        memberId: string;
        type: 'DUE_REMINDER' | 'OVERDUE';
        days: number;
        items: { title: string; dueAt: string }[];
      }
    >();
    for (const loan of loans) {
      const dueDate = toLocalDate(loan.dueAt, tz);
      const days = lateDays(loan.dueAt, now, new Set(), tz);
      const type =
        dueDate === reminderDate
          ? 'DUE_REMINDER'
          : OVERDUE_DAYS.has(days)
            ? 'OVERDUE'
            : null;
      if (!type) continue;
      const key = `${loan.memberId}:${type}:${days}`;
      const g = groups.get(key) ?? {
        memberId: loan.memberId!,
        type,
        days,
        items: [],
      };
      g.items.push({
        title: loan.item.book.title,
        dueAt: formatDate(loan.dueAt, tz),
      });
      groups.set(key, g);
    }

    for (const g of groups.values()) {
      const titles = g.items.map((i) => i.title).join(', ');
      await this.notifications.notify(g.memberId, g.type, {
        items: g.items,
        days: g.days,
        dueDate: formatDate(endOfLocalDay(reminderDate, tz), tz),
        message:
          g.type === 'DUE_REMINDER'
            ? `Jatuh tempo 2 hari lagi: ${titles}`
            : `Terlambat ${g.days} hari: ${titles}`,
        dedupeKey: `${g.type}:${today}:${g.days}`,
      });
    }
    this.logger.log(`${groups.size} notifikasi reminder dibuat`);
    return { sent: groups.size };
  }
}
