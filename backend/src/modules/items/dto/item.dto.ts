import { z } from 'zod';
import { ItemSource, ItemStatus } from '../../../generated/prisma/enums.js';

// Sama dengan frontend shared/types/enums.ts ITEM_CONDITIONS
export const ITEM_CONDITIONS = ['GOOD', 'FAIR', 'POOR'] as const;

const fields = {
  shelfLocationId: z.string().min(1).nullish(),
  condition: z.enum(ITEM_CONDITIONS).default('GOOD'),
  source: z.enum(ItemSource).default('PURCHASE'),
  price: z.coerce.number().int().min(0).nullish(),
  acquiredAt: z.iso.date().optional(),
};

export const createItemsSchema = z
  .object({
    ...fields,
    // wajib: label, "kembali ke rak" di meja sirkulasi, dan OPAC butuh lokasi rak
    shelfLocationId: z.string().min(1, 'Lokasi rak wajib diisi'),
    // jumlah eksemplar dengan barcode otomatis
    count: z.coerce.number().int().min(1).max(200).optional(),
    // atau barcode manual (migrasi label lama); array kosong = otomatis
    barcodes: z
      .array(z.string().trim().min(3).max(40))
      .max(200)
      .optional()
      .transform((v) => (v?.length ? v : undefined)),
  })
  .refine((v) => !!v.count || !!v.barcodes, {
    message: 'Isi jumlah eksemplar atau daftar barcode',
    path: ['count'],
  });
export type CreateItemsDto = z.infer<typeof createItemsSchema>;

export const updateItemSchema = z
  .object({
    ...fields,
    condition: z.enum(ITEM_CONDITIONS),
    source: z.enum(ItemSource),
    status: z.enum(ItemStatus),
  })
  .partial();
export type UpdateItemDto = z.infer<typeof updateItemSchema>;

export const barcodeQuerySchema = z.object({
  barcode: z.string().trim().min(1),
});

/** GET /items/labels?ids=a,b,c */
export const labelsQuerySchema = z.object({
  ids: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(1).max(500)),
});
