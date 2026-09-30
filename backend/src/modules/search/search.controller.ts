import { Controller, Get, Param } from '@nestjs/common';
import { Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { type SearchDto, searchSchema } from './dto/search.dto.js';
import { SearchService } from './search.service.js';

@Public()
@Controller()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('search')
  query(@Query({ schema: searchSchema }) dto: SearchDto) {
    return this.search.search(dto);
  }

  @Get('books/:id/similar')
  similar(@Param('id') id: string) {
    return this.search.similar(id);
  }
}
