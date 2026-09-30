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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Staff } from '../../common/decorators/roles.decorator.js';
import { unprocessable } from '../../common/errors.js';
import { BooksService } from './books.service.js';
import { COVER_MAX_BYTES, CoverService } from './cover.service.js';
import {
  type BookQuery,
  bookQuerySchema,
  type CreateBookDto,
  createBookSchema,
  type UpdateBookDto,
  updateBookSchema,
} from './dto/book.dto.js';
import { IsbnLookupService } from './isbn-lookup.service.js';

@Controller('books')
export class BooksController {
  constructor(
    private readonly books: BooksService,
    private readonly isbn: IsbnLookupService,
    private readonly covers: CoverService,
  ) {}

  @Public()
  @Get()
  list(@Query({ schema: bookQuerySchema }) q: BookQuery) {
    return this.books.list(q);
  }

  @Staff()
  @Get('isbn/:isbn/lookup')
  lookup(@Param('isbn') isbn: string) {
    return this.isbn.lookup(isbn);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.books.get(id);
  }

  @Staff()
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createBookSchema }) dto: CreateBookDto,
  ) {
    return this.books.create(user.id, dto);
  }

  @Staff()
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: updateBookSchema }) dto: UpdateBookDto,
  ) {
    return this.books.update(user.id, id, dto);
  }

  @Staff()
  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.books.remove(user.id, id);
  }

  @Staff()
  @Post(':id/cover')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: COVER_MAX_BYTES } }),
  )
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file)
      throw unprocessable(
        'FILE_REQUIRED',
        'File cover wajib diunggah (field "file")',
      );
    await this.books.assertExists(id);
    await this.covers.upload(id, file.buffer);
    const book = await this.books.get(id);
    return { coverUrl: book.coverUrl, cover: book.cover };
  }

  @Staff()
  @Delete(':id/cover')
  @HttpCode(204)
  async removeCover(@Param('id') id: string) {
    await this.books.assertExists(id);
    await this.covers.remove(id);
  }
}
