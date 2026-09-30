import { z } from "zod";
import { FINE_STATUSES, FINE_TYPES } from "@/shared/types/enums";

export const checkoutSchema = z.object({
  memberCode: z.string().trim().min(1, "Scan kartu anggota dulu"),
  barcodes: z.array(z.string().trim().min(1)).min(1, "Scan minimal satu eksemplar"),
});
export type CheckoutValues = z.infer<typeof checkoutSchema>;

export const checkinSchema = z.object({
  barcode: z.string().trim().min(1, "Scan barcode eksemplar"),
});
export type CheckinValues = z.infer<typeof checkinSchema>;

// FR-E4: replacement fine defaults to the item price, editable.
export const markLostSchema = z.object({
  type: z.enum(["LOST", "DAMAGED"]),
  amount: z.coerce.number().int().min(0, "Nominal tidak valid"),
  note: z.string().trim().max(500).optional(),
});
export type MarkLostValues = z.output<typeof markLostSchema>;

/** Built per fine so the max is the outstanding balance (partial payments allowed, FR-F2). */
export const finePaymentSchema = (outstanding: number) =>
  z.object({
    amount: z.coerce
      .number({ error: "Nominal tidak valid" })
      .int()
      .min(1, "Minimal Rp1")
      .max(outstanding, "Melebihi sisa denda"),
  });
export type FinePaymentValues = z.output<ReturnType<typeof finePaymentSchema>>;

// FR-F3: ADMIN only, reason required.
export const fineWaiveSchema = z.object({
  reason: z.string().trim().min(10, "Tulis alasan minimal 10 karakter").max(500),
});
export type FineWaiveValues = z.infer<typeof fineWaiveSchema>;

export const fineQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(FINE_STATUSES).optional(),
  type: z.enum(FINE_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type FineQuery = z.input<typeof fineQuerySchema>;
