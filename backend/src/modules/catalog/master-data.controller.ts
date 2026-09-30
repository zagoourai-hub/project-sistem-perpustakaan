import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator.js';
import { Staff } from '../../common/decorators/roles.decorator.js';
import {
  MasterDataService,
  masterQuerySchema,
  type MasterType,
  masterTypeSchema,
} from './master-data.service.js';

/** /master-data/{authors|publishers|subjects|shelves} */
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly master: MasterDataService) {}

  // publik: dipakai filter OPAC & autocomplete form
  @Public()
  @Get(':type')
  list(
    @Param('type', { schema: masterTypeSchema }) type: MasterType,
    @Query({ schema: masterQuerySchema }) q: z.infer<typeof masterQuerySchema>,
  ) {
    return this.master.list(type, q);
  }

  @Staff()
  @Post(':type')
  create(
    @Param('type', { schema: masterTypeSchema }) type: MasterType,
    @Body() body: unknown,
  ) {
    return this.master.create(type, body);
  }

  @Staff()
  @Patch(':type/:id')
  update(
    @Param('type', { schema: masterTypeSchema }) type: MasterType,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.master.update(type, id, body);
  }

  @Staff()
  @Delete(':type/:id')
  @HttpCode(204)
  remove(
    @Param('type', { schema: masterTypeSchema }) type: MasterType,
    @Param('id') id: string,
  ) {
    return this.master.remove(type, id);
  }
}
