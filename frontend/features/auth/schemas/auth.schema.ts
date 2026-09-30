import { z } from "zod";

export const loginSchema = z.object({
  /** Email or nomor induk (NIS/NIM/NIP) — FR-A1. */
  identifier: z.string().trim().min(1, "Email atau nomor induk wajib diisi"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi lama wajib diisi"),
    newPassword: z
      .string()
      .min(8, "Minimal 8 karakter")
      .regex(/[A-Za-z]/, "Harus mengandung huruf")
      .regex(/\d/, "Harus mengandung angka"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Kata sandi baru harus berbeda",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
