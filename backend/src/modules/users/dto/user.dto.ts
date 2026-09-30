import { z } from 'zod';
import { passwordRule } from '../../auth/dto/change-password.dto.js';

const staffRole = z.enum(['ADMIN', 'LIBRARIAN']);

export const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().toLowerCase(),
  role: staffRole,
  // kosong = password sementara di-generate & wajib ganti saat login pertama
  password: passwordRule.optional(),
});
export type CreateStaffDto = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.email().toLowerCase(),
    role: staffRole,
    isActive: z.boolean(),
  })
  .partial();
export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;

export const staffQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: staffRole.optional(),
});
export type StaffQuery = z.infer<typeof staffQuerySchema>;
