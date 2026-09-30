import { z } from "zod";

const money = z.coerce.number().int().min(0, "Tidak boleh negatif");
const count = (label: string) => z.coerce.number().int().min(0, `${label} tidak valid`);

// FR-D1: one policy per member type.
export const loanPolicySchema = z.object({
  maxActiveLoans: count("Maks pinjaman"),
  loanDays: z.coerce.number().int().min(1, "Minimal 1 hari"),
  maxRenewals: count("Maks perpanjangan"),
  finePerDay: money,
  maxFinePerLoan: money,
  blockingFineThreshold: money,
  holdPickupDays: z.coerce.number().int().min(1, "Minimal 1 hari"),
  maxActiveHolds: count("Maks reservasi"),
});
export type LoanPolicyValues = z.output<typeof loanPolicySchema>;

export const holidaySchema = z.object({
  date: z.iso.date("Tanggal tidak valid"),
  name: z.string().trim().min(1, "Nama hari libur wajib diisi").max(120),
});
export type HolidayValues = z.infer<typeof holidaySchema>;

export const staffSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(120),
  email: z.email("Email tidak valid"),
  role: z.enum(["ADMIN", "LIBRARIAN"]),
});
export type StaffValues = z.infer<typeof staffSchema>;

export const settingsSchema = z.object({
  institutionName: z.string().trim().min(1, "Nama institusi wajib diisi").max(160),
  // The backend stores empty values as null and rejects "" for the email.
  address: z.string().trim().max(300).transform((v) => v || null),
  openingHours: z.string().trim().max(300).transform((v) => v || null),
  senderEmail: z.union([z.email("Email tidak valid"), z.literal("").transform(() => null)]),
  timezone: z.string().min(1).default("Asia/Jakarta"),
});
export type SettingsValues = z.output<typeof settingsSchema>;

export const auditQuerySchema = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type AuditQuery = z.input<typeof auditQuerySchema>;
