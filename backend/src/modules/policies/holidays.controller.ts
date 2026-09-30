import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  type CreateHolidayDto,
  createHolidaySchema,
  holidayQuerySchema,
  HolidaysService,
} from './holidays.service.js';

@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Public()
  @Get()
  list(
    @Query({ schema: holidayQuerySchema })
    q: z.infer<typeof holidayQuerySchema>,
  ) {
    return this.holidays.list(q.year);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body({ schema: createHolidaySchema }) dto: CreateHolidayDto) {
    return this.holidays.create(dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.holidays.remove(id);
  }
}
