import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { NotificationsService } from './notifications.service.js';

/** Lonceng in-app di portal anggota. */
@Roles('MEMBER')
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('me/notifications')
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.memberId!);
  }

  @Get('me/notifications/unread-count')
  async unreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user.memberId!) };
  }

  @Post('notifications/read-all')
  @HttpCode(204)
  async readAll(@CurrentUser() user: AuthUser) {
    await this.notifications.markAllRead(user.memberId!);
  }

  @Post('notifications/:id/read')
  @HttpCode(204)
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.memberId!, id);
  }
}
