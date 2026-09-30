import { Global, Module } from '@nestjs/common';
import { DueReminderProcessor } from './due-reminder.processor.js';
import { MailProcessor } from './mail.processor.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, MailProcessor, DueReminderProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
