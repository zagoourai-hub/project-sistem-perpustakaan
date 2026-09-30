import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { ReindexService } from './reindex.service.js';

@Roles('ADMIN')
@Controller('ai')
export class AiController {
  constructor(
    private readonly reindex: ReindexService,
    private readonly audit: AuditService,
  ) {}

  @Post('reindex')
  @HttpCode(202)
  async start(@CurrentUser() user: AuthUser) {
    const status = await this.reindex.start();
    await this.audit.log({
      actorId: user.id,
      action: 'ai.reindex',
      entityType: 'BookEmbedding',
    });
    return status;
  }

  @Get('status')
  status() {
    return this.reindex.status();
  }
}
