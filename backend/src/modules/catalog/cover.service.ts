import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { unprocessable } from '../../common/errors.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';

export const COVER_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['jpeg', 'png', 'webp']);
const SIZES = { sm: 240, lg: 720 } as const;

@Injectable()
export class CoverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Validasi dari isi file (bukan header mime), resize 2 ukuran → WebP. */
  async upload(bookId: string, file: Buffer) {
    if (file.length > COVER_MAX_BYTES)
      throw unprocessable('FILE_TOO_LARGE', 'Cover maksimal 2 MB');
    const meta = await sharp(file)
      .metadata()
      .catch(() => null);
    if (!meta?.format || !ALLOWED.has(meta.format)) {
      throw unprocessable('INVALID_FILE', 'Cover harus JPEG, PNG, atau WebP');
    }

    const key = `covers/${bookId}/${randomUUID()}`;
    await Promise.all(
      Object.entries(SIZES).map(async ([suffix, width]) => {
        const out = await sharp(file)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        await this.storage.upload(`${key}-${suffix}.webp`, out, 'image/webp');
      }),
    );

    const old = await this.prisma.book.findUniqueOrThrow({
      where: { id: bookId },
      select: { coverKey: true },
    });
    await this.prisma.book.update({
      where: { id: bookId },
      data: { coverKey: key },
    });
    if (old.coverKey) await this.removeFiles(old.coverKey);
    return key;
  }

  async remove(bookId: string) {
    const { coverKey } = await this.prisma.book.findUniqueOrThrow({
      where: { id: bookId },
      select: { coverKey: true },
    });
    await this.prisma.book.update({
      where: { id: bookId },
      data: { coverKey: null },
    });
    if (coverKey) await this.removeFiles(coverKey);
  }

  private async removeFiles(key: string) {
    await Promise.all(
      Object.keys(SIZES).map((s) =>
        this.storage.delete(`${key}-${s}.webp`).catch(() => undefined),
      ),
    );
  }
}
