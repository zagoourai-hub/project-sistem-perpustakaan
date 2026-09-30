import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { DAILY_AT, QUEUES } from '../../infra/queue/queue.module.js';
import { SettingsService } from '../settings/settings.service.js';
import { MembersService } from './members.service.js';

/** Job harian 00:05: anggota lewat masa berlaku → EXPIRED. */
@Processor(QUEUES.members)
export class MemberStatusJob extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(MemberStatusJob.name);

  constructor(
    @InjectQueue(QUEUES.members) private readonly queue: Queue,
    private readonly members: MembersService,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'expire-members',
      DAILY_AT(0, await this.settings.timezone()),
      {
        name: 'expire-members',
      },
    );
  }

  async process() {
    const count = await this.members.expireOverdueMemberships();
    this.logger.log(`${count} anggota ditandai EXPIRED`);
    return { count };
  }
}
