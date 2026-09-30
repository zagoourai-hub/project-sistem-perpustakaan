import { z } from 'zod';

export const loginSchema = z.object({
  // email (staf) atau nomor induk / kode anggota (anggota)
  identifier: z.string().trim().min(1).max(191),
  password: z.string().min(1).max(200),
});
export type LoginDto = z.infer<typeof loginSchema>;
