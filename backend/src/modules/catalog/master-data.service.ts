import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { conflict } from '../../common/errors.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export const masterTypeSchema = z.enum([
  'authors',
  'publishers',
  'subjects',
  'shelf-locations',
]);
export type MasterType = z.infer<typeof masterTypeSchema>;

export const nameSchema = z.object({ name: z.string().trim().min(1).max(200) });
export const shelfSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(160),
});
export const masterQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

type NameModel = 'author' | 'publisher' | 'subject';
const MODEL: Record<Exclude<MasterType, 'shelf-locations'>, NameModel> = {
  authors: 'author',
  publishers: 'publisher',
  subjects: 'subject',
};

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  // Delegate Prisma berbeda tipe tapi bentuk operasinya sama untuk author/publisher/subject.
  private named(type: Exclude<MasterType, 'shelf-locations'>) {
    return this.prisma[MODEL[type]] as unknown as {
      findMany(args: object): Promise<{ id: string; name: string }[]>;
      create(args: object): Promise<{ id: string; name: string }>;
      update(args: object): Promise<{ id: string; name: string }>;
      delete(args: object): Promise<unknown>;
    };
  }

  list(type: MasterType, q: z.infer<typeof masterQuerySchema>) {
    if (type === 'shelf-locations') {
      return this.prisma.shelfLocation.findMany({
        where: q.q
          ? {
              OR: [
                { code: { contains: q.q, mode: 'insensitive' } },
                { name: { contains: q.q, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: { code: 'asc' },
        take: q.limit,
      });
    }
    return this.named(type).findMany({
      where: q.q ? { name: { contains: q.q, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
      take: q.limit,
    });
  }

  create(type: MasterType, body: unknown) {
    if (type === 'shelf-locations')
      return this.prisma.shelfLocation.create({
        data: shelfSchema.parse(body),
      });
    return this.named(type).create({ data: nameSchema.parse(body) });
  }

  update(type: MasterType, id: string, body: unknown) {
    if (type === 'shelf-locations') {
      return this.prisma.shelfLocation.update({
        where: { id },
        data: shelfSchema.partial().parse(body),
      });
    }
    return this.named(type).update({
      where: { id },
      data: nameSchema.parse(body),
    });
  }

  async remove(type: MasterType, id: string) {
    if (type === 'shelf-locations') {
      const used = await this.prisma.item.count({
        where: { shelfLocationId: id, deletedAt: null },
      });
      if (used)
        throw conflict('IN_USE', `Lokasi rak masih dipakai ${used} eksemplar`);
      await this.prisma.shelfLocation.delete({ where: { id } });
      return;
    }
    // relasi buku Restrict → P2003 dipetakan filter jadi 409 IN_USE
    await this.named(type).delete({ where: { id } });
  }
}
