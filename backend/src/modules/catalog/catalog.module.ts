import { Global, Module } from '@nestjs/common';
import { BookPresenter } from './book.presenter.js';
import { BookEvents } from './book-events.js';
import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';
import { CoverService } from './cover.service.js';
import { IsbnLookupService } from './isbn-lookup.service.js';
import { MasterDataController } from './master-data.controller.js';
import { MasterDataService } from './master-data.service.js';
import { LoanPresenter } from './loan.presenter.js';

@Global()
@Module({
  controllers: [BooksController, MasterDataController],
  providers: [
    BooksService,
    BookPresenter,
    LoanPresenter,
    BookEvents,
    IsbnLookupService,
    CoverService,
    MasterDataService,
  ],
  exports: [BooksService, BookPresenter, LoanPresenter],
})
export class CatalogModule {}
