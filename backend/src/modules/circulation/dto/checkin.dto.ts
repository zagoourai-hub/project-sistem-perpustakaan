import { z } from 'zod';

export const checkinSchema = z.object({
  barcode: z
    .string()
    .trim()
    .min(1)
    .transform((b) => b.toUpperCase()),
});
export type CheckinDto = z.infer<typeof checkinSchema>;

export const markLostSchema = z.object({
  type: z.enum(['LOST', 'DAMAGED']).default('LOST'),
  // default harga eksemplar
  amount: z.number().int().min(0).optional(),
  note: z.string().trim().max(500).optional(),
});
export type MarkLostDto = z.infer<typeof markLostSchema>;
