import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../../infra/config/env.schema.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';

export const libraryProfileSchema = z.object({
  institutionName: z.string().trim().min(1).max(200),
  address: z.string().max(500).nullable(),
  openingHours: z.string().max(500).nullable(),
  senderEmail: z.email().nullable(),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Timezone tidak dikenal'),
  logoKey: z.string().nullable(),
  // retensi riwayat pinjam setelah anggota keluar (tahun), UU PDP
  historyRetentionYears: z.number().int().min(1).max(10),
});
export type LibraryProfile = z.infer<typeof libraryProfileSchema>;

export const updateLibraryProfileSchema = libraryProfileSchema
  .omit({ logoKey: true })
  .partial();
export type UpdateLibraryProfile = z.infer<typeof updateLibraryProfileSchema>;

const KEY = 'library';

@Injectable()
export class SettingsService {
  private cache?: LibraryProfile;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  defaults(): LibraryProfile {
    return {
      institutionName: 'Perpustakaan',
      address: null,
      openingHours: null,
      senderEmail: null,
      timezone: this.config.get('APP_TIMEZONE', { infer: true }),
      logoKey: null,
      historyRetentionYears: 2,
    };
  }

  async get(): Promise<LibraryProfile> {
    if (this.cache) return this.cache;
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    const stored = (row?.value ?? {}) as Partial<LibraryProfile> & {
      name?: string;
    };
    // kompatibilitas data lama yang memakai key "name"
    if (stored.name && !stored.institutionName)
      stored.institutionName = stored.name;
    delete stored.name;
    this.cache = { ...this.defaults(), ...stored };
    return this.cache;
  }

  async timezone() {
    return (await this.get()).timezone;
  }

  async update(patch: Partial<LibraryProfile>) {
    const value = { ...(await this.get()), ...patch };
    await this.prisma.setting.upsert({
      where: { key: KEY },
      create: { key: KEY, value },
      update: { value },
    });
    this.cache = value;
    return this.present(value);
  }

  present(p: LibraryProfile) {
    return { ...p, logoUrl: this.storage.publicUrl(p.logoKey) };
  }
}
