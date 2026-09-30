import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { MemberImportService } from './member-import.service.js';
import { MemberStatusJob } from './member-status.job.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';

@Module({
  imports: [UsersModule],
  controllers: [MembersController],
  providers: [MembersService, MemberImportService, MemberStatusJob],
  exports: [MembersService],
})
export class MembersModule {}
