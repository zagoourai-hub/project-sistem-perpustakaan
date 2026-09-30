import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { Env } from '../../infra/config/env.schema.js';
import { MailService } from '../../infra/mail/mail.service.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { QUEUES } from '../../infra/queue/queue.module.js';
import { SettingsService } from '../settings/settings.service.js';
import type { MailJobData } from './notifications.service.js';

/** Email yang bisa dimatikan anggota (FR-J4); sisanya transaksional wajib. */
const OPTIONAL = new Set(['DUE_REMINDER', 'OVERDUE']);

@Processor(QUEUES.mail, { concurrency: 5 })
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
    private readonly config: ConfigService<Env, true>,
  ) {
    super();
  }

  async process(job: Job<MailJobData>) {
    const n = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId },
      include: {
        member: {
          select: {
            emailReminders: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
    if (!n || n.status === 'SENT') return;

    const email = n.member.user.email;
    if (!email || (OPTIONAL.has(n.type) && !n.member.emailReminders)) {
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { status: 'SKIPPED' },
      });
      return;
    }

    try {
      const library = await this.settings.get();
      await this.mail.sendTemplate(
        email,
        n.type,
        {
          ...(n.payload as Record<string, unknown>),
          memberName: n.member.user.name,
          libraryName: library.institutionName,
          portalUrl: this.config.get('PORTAL_URL', { infer: true }),
        },
        library.senderEmail
          ? `${library.institutionName} <${library.senderEmail}>`
          : undefined,
      );
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { status: 'SENT', sentAt: new Date(), error: null },
      });
    } catch (e) {
      const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await this.prisma.notification.update({
        where: { id: n.id },
        data: {
          status: final ? 'FAILED' : 'PENDING',
          error: (e as Error).message.slice(0, 500),
        },
      });
      this.logger.warn(
        `Email ${n.id} gagal (percobaan ${job.attemptsMade + 1}): ${(e as Error).message}`,
      );
      throw e;
    }
  }
}
