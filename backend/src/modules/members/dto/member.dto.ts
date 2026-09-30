import { z } from 'zod';
import { paginationSchema } from '../../../common/pagination/pagination.schema.js';
import { MemberStatus, MemberType } from '../../../generated/prisma/enums.js';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish();

export const createMemberSchema = z.object({
  name: z.string().trim().min(1).max(120),
  idNumber: z.string().trim().min(1).max(40),
  type: z.enum(MemberType),
  classOrMajor: optionalText(80),
  email: z
    .email()
    .toLowerCase()
    .nullish()
    .or(z.literal('').transform(() => null)),
  phone: optionalText(30),
  validUntil: z.iso.date(),
  status: z.enum(MemberStatus).optional(),
});
export type CreateMemberDto = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = createMemberSchema
  .extend({ emailReminders: z.boolean() })
  .partial();
export type UpdateMemberDto = z.infer<typeof updateMemberSchema>;

export const memberQuerySchema = paginationSchema.extend({
  q: z.string().trim().optional(),
  type: z.enum(MemberType).optional(),
  status: z.enum(MemberStatus).optional(),
  classOrMajor: z.string().trim().optional(),
});
export type MemberQuery = z.infer<typeof memberQuerySchema>;

export const lookupSchema = z.object({ code: z.string().trim().min(1) });
