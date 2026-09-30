import { z } from 'zod';

export const passwordRule = z
  .string()
  .min(8, 'Minimal 8 karakter')
  .max(200)
  .regex(/[A-Za-z]/, 'Harus mengandung huruf')
  .regex(/\d/, 'Harus mengandung angka');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordRule,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'Password baru harus berbeda',
  });
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
