import { z } from 'zod';

export const checkoutSchema = z.object({
  // member code dari QR kartu, atau nomor induk
  memberCode: z.string().trim().min(1),
  barcodes: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .transform((b) => b.toUpperCase()),
    )
    .min(1)
    .max(20),
});
export type CheckoutDto = z.infer<typeof checkoutSchema>;
