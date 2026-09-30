import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { z } from 'zod';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Staff } from '../../common/decorators/roles.decorator.js';
import {
  barcodeQuerySchema,
  type CreateItemsDto,
  createItemsSchema,
  labelsQuerySchema,
  type UpdateItemDto,
  updateItemSchema,
} from './dto/item.dto.js';
import { ItemsService } from './items.service.js';

@Staff()
@Controller()
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get('books/:id/items')
  list(@Param('id') bookId: string) {
    return this.items.listForBook(bookId);
  }

  @Post('books/:id/items')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') bookId: string,
    @Body({ schema: createItemsSchema }) dto: CreateItemsDto,
  ) {
    return this.items.createBatch(user.id, bookId, dto);
  }

  @Get('items/lookup')
  lookup(@Query({ schema: barcodeQuerySchema }) q: { barcode: string }) {
    return this.items.lookup(q.barcode);
  }

  /** Unduh PDF label: GET /items/labels?ids=a,b,c */
  @Get('items/labels')
  async labels(
    @Query({ schema: labelsQuerySchema }) q: z.infer<typeof labelsQuerySchema>,
  ) {
    return new StreamableFile(await this.items.labelsPdf(q.ids), {
      type: 'application/pdf',
      disposition: 'attachment; filename="label-barcode.pdf"',
    });
  }

  @Patch('items/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: updateItemSchema }) dto: UpdateItemDto,
  ) {
    return this.items.update(user.id, id, dto);
  }
}
