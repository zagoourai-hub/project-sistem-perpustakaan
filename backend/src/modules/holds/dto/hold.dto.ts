import { z } from 'zod';

export const createHoldSchema = z.object({
  bookId: z.string().min(1),
  // hanya staf: reservasi atas nama anggota
  memberId: z.string().optional(),
});
export type CreateHoldDto = z.infer<typeof createHoldSchema>;
