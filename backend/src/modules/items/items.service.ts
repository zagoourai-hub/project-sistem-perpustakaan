import { Injectable } from '@nestjs/common';
import { conflict, notFound, unprocessable } from '../../common/errors.js';
import { toLocalDate } from '../../common/utils/date.util.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  BookPresenter,
  itemSelect,
  presentItem,
} from '../catalog/book.presenter.js';
import { BooksService } from '../catalog/books.service.js';
import { HoldAllocationService } from '../holds/hold-allocation.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { BarcodeService } from './barcode.service.js';
import type { CreateItemsDto, UpdateItemDto } from './dto/item.dto.js';
import { canTransitionManually } from './item-state.machine.js';
import { renderLabelsPdf } from './label-pdf.js';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barcodes: BarcodeService,
    private readonly books: BooksService,
    private readonly presenter: BookPresenter,
    private readonly holds: HoldAllocationService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  async listForBook(bookId: string) {
    const rows = await this.prisma.item.findMany({
      where: { bookId, deletedAt: null },
      orderBy: { barcode: 'asc' },
      select: itemSelect,
    });
    return rows.map(presentItem);
  }

  private async one(id: string) {
    return presentItem(
      await this.prisma.item.findUniqueOrThrow({
        where: { id },
        select: itemSelect,
      }),
    );
  }

  /** Buat N eksemplar sekaligus (barcode otomatis) atau dari daftar barcode manual. */
  async createBatch(actorId: string, bookId: string, dto: CreateItemsDto) {
    await this.books.assertExists(bookId);
    const { count, barcodes: manual, acquiredAt, ...fields } = dto;
    if (manual) {
      const taken = await this.prisma.item.findMany({
        where: { barcode: { in: manual } },
        select: { barcode: true },
      });
      if (taken.length) {
        throw conflict('BARCODE_TAKEN', 'Barcode sudah dipakai', {
          barcodes: taken.map((t) => `${t.barcode} sudah dipakai`),
        });
      }
    }
    // Kolom @db.Date: tanggal default = hari ini di zona perpustakaan, bukan UTC (mundur 1 hari sebelum 07.00 WIB).
    const acquired = acquiredAt ?? toLocalDate(new Date(), await this.settings.timezone());
    const ids = await this.prisma.$transaction(async (tx) => {
      const codes = manual ?? (await this.barcodes.next(tx, count!));
      await tx.item.createMany({
        data: codes.map((barcode) => ({
          ...fields,
          bookId,
          barcode,
          acquiredAt: new Date(acquired),
        })),
      });
      await this.audit.log(
        {
          actorId,
          action: 'item.create',
          entityType: 'Book',
          entityId: bookId,
          metadata: { barcodes: codes },
        },
        tx,
      );
      return (
        await tx.item.findMany({
          where: { barcode: { in: codes } },
          select: { id: true },
        })
      ).map((i) => i.id);
    });
    // eksemplar baru bisa langsung melayani antrean reservasi
    for (const id of ids) await this.holds.allocate(id);
    const rows = await this.prisma.item.findMany({
      where: { id: { in: ids } },
      select: itemSelect,
      orderBy: { barcode: 'asc' },
    });
    return rows.map(presentItem);
  }

  async update(actorId: string, id: string, dto: UpdateItemDto) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) throw notFound('Eksemplar');
    const { status, acquiredAt, ...fields } = dto;
    if (
      status &&
      status !== item.status &&
      !canTransitionManually(item.status, status)
    ) {
      throw unprocessable(
        'INVALID_STATUS_TRANSITION',
        `Status tidak bisa diubah dari ${item.status} ke ${status}`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      // update bersyarat agar tidak menimpa perubahan dari sirkulasi yang berjalan bersamaan
      const { count } = await tx.item.updateMany({
        where: { id, status: item.status },
        data: {
          ...fields,
          status,
          acquiredAt: acquiredAt ? new Date(acquiredAt) : undefined,
        },
      });
      if (count === 0)
        throw conflict(
          'ITEM_CHANGED',
          'Status eksemplar baru saja berubah, muat ulang',
        );
      await this.audit.log(
        {
          actorId,
          action: 'item.update',
          entityType: 'Item',
          entityId: id,
          metadata: { ...dto, previousStatus: item.status },
        },
        tx,
      );
    });
    if (status === 'AVAILABLE' && item.status !== 'AVAILABLE')
      await this.holds.allocate(id);
    return this.one(id);
  }

  /**
   * Scan barcode eksemplar → ItemWithBook (+ pinjaman aktif & hold READY untuk panel staf).
   * Dipakai frontend untuk precheck setiap scan di meja pinjam.
   */
  async lookup(barcode: string) {
    const [item] = await this.presenter.itemsWithBook({
      barcode: barcode.toUpperCase(),
      deletedAt: null,
    });
    if (!item) throw notFound('Eksemplar');
    const [activeLoan, readyHold] = await Promise.all([
      this.prisma.loan.findFirst({
        where: { itemId: item.id, returnedAt: null },
        select: {
          id: true,
          checkedOutAt: true,
          dueAt: true,
          renewCount: true,
          member: {
            select: {
              id: true,
              memberCode: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.hold.findFirst({
        where: { itemId: item.id, status: 'READY' },
        select: {
          id: true,
          expiresAt: true,
          member: {
            select: {
              id: true,
              memberCode: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
    ]);
    return { ...item, activeLoan, readyHold };
  }

  /** PDF label siap cetak (A4, grid 3 × 8). */
  async labelsPdf(itemIds: string[]) {
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds }, deletedAt: null },
      orderBy: { barcode: 'asc' },
      select: {
        barcode: true,
        book: { select: { title: true, callNumber: true } },
        shelfLocation: { select: { code: true } },
      },
    });
    if (!items.length) throw notFound('Eksemplar');
    return renderLabelsPdf(
      items.map((i) => ({
        barcode: i.barcode,
        title: i.book.title,
        callNumber: i.book.callNumber,
        shelf: i.shelfLocation?.code ?? null,
      })),
    );
  }
}
