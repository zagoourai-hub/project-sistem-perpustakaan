import { z } from "zod";
import { MEMBER_STATUSES, MEMBER_TYPES } from "@/shared/types/enums";

// Data minimization (UU PDP, members may be minors): only the fields FR-C1 needs.
export const memberSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(120),
  email: z.union([z.email("Email tidak valid"), z.literal("").transform(() => undefined)]).optional(),
  idNumber: z.string().trim().min(1, "Nomor induk wajib diisi").max(30),
  type: z.enum(MEMBER_TYPES, { error: "Pilih tipe anggota" }),
  classOrMajor: z.string().trim().max(60).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|0)8\d{7,12}$/, "Nomor HP tidak valid")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  validUntil: z.iso.date("Tanggal tidak valid"),
  status: z.enum(MEMBER_STATUSES).default("ACTIVE"),
});
export type MemberFormInput = z.input<typeof memberSchema>;
export type MemberFormValues = z.output<typeof memberSchema>;

export const memberQuerySchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(MEMBER_TYPES).optional(),
  status: z.enum(MEMBER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type MemberQuery = z.input<typeof memberQuerySchema>;

export const memberImportSchema = z.object({
  file: z
    .instanceof(File, { error: "Pilih berkas CSV" })
    .refine((f) => f.name.toLowerCase().endsWith(".csv"), "Berkas harus .csv")
    .refine((f) => f.size <= 5 * 1024 * 1024, "Maksimal 5 MB"),
});
export type MemberImportInput = z.infer<typeof memberImportSchema>;
