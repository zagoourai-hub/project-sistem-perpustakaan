import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  type CreateStaffDto,
  createStaffSchema,
  type StaffQuery,
  staffQuerySchema,
  type UpdateStaffDto,
  updateStaffSchema,
} from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@Roles('ADMIN')
@Controller('staff')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query({ schema: staffQuerySchema }) q: StaffQuery) {
    return this.users.list(q);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createStaffSchema }) dto: CreateStaffDto,
  ) {
    return this.users.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: updateStaffSchema }) dto: UpdateStaffDto,
  ) {
    return this.users.update(user.id, id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  resetPassword(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.resetPassword(user.id, id);
  }
}
