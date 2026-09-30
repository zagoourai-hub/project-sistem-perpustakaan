import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';

export const ITEM_BARCODE_PREFIX = 'PST-';

@Injectable()
export class BarcodeService {
  /** PST-{YYYY}-{seq6}; sequence Postgres global sehingga unik lintas tahun. */
  async next(
    tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
    count = 1,
  ): Promise<string[]> {
    const rows = await tx.$queryRaw<{ seq: bigint }[]>`
      SELECT nextval('item_barcode_seq') AS seq FROM generate_series(1, ${count})`;
    const year = new Date().getFullYear();
    return rows.map(
      (r) => `${ITEM_BARCODE_PREFIX}${year}-${String(r.seq).padStart(6, '0')}`,
    );
  }
}
