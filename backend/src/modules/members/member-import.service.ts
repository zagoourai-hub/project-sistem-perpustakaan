import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { unprocessable } from '../../common/errors.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PasswordService } from '../auth/password.service.js';
import { type CreateMemberDto, createMemberSchema } from './dto/member.dto.js';
import { MembersService, presentMember } from './members.service.js';

const TYPE_ALIASES: Record<string, string> = {
  STUDENT: 'STUDENT',
  SISWA: 'STUDENT',
  MAHASISWA: 'STUDENT',
  STAFF: 'STAFF',
  STAF: 'STAFF',
  GURU: 'STAFF',
  DOSEN: 'STAFF',
};

export const IMPORT_COLUMNS = [
  'name',
  'idNumber',
  'type',
  'classOrMajor',
  'email',
  'phone',
  'validUntil',
];
const MAX_ROWS = 5000;

export interface ImportRowError {
  row: number; // nomor baris di file (header = 1)
  idNumber?: string;
  errors: string[];
}

@Injectable()
export class MemberImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Header CSV: name,idNumber,type,classOrMajor,email,phone,validUntil (YYYY-MM-DD).
   * Baris valid tetap di-import walau ada baris gagal; dryRun hanya memvalidasi.
   */
  async import(actorId: string, csv: Buffer, dryRun: boolean) {
    let records: Record<string, string>[];
    try {
      records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (e) {
      throw unprocessable(
        'CSV_INVALID',
        `CSV tidak bisa dibaca: ${(e as Error).message}`,
      );
    }
    if (records.length > MAX_ROWS) {
      throw unprocessable(
        'CSV_TOO_LARGE',
        `Maksimal ${MAX_ROWS} baris per import`,
      );
    }

    const failed: ImportRowError[] = [];
    const valid: { row: number; dto: CreateMemberDto }[] = [];
    const seen = new Set<string>();
    records.forEach((rec, i) => {
      const row = i + 2;
      const parsed = createMemberSchema.safeParse({
        ...rec,
        type: TYPE_ALIASES[(rec.type ?? '').toUpperCase()] ?? rec.type,
      });
      if (!parsed.success) {
        failed.push({
          row,
          idNumber: rec.idNumber,
          errors: parsed.error.issues.map(
            (x) => `${x.path.join('.')}: ${x.message}`,
          ),
        });
      } else if (seen.has(parsed.data.idNumber)) {
        failed.push({
          row,
          idNumber: rec.idNumber,
          errors: ['idNumber duplikat di file'],
        });
      } else {
        seen.add(parsed.data.idNumber);
        valid.push({ row, dto: parsed.data });
      }
    });

    // duplikat terhadap data yang sudah ada
    const existing = await this.prisma.member.findMany({
      where: { idNumber: { in: valid.map((v) => v.dto.idNumber) } },
      select: { idNumber: true },
    });
    const emails = valid
      .map((v) => v.dto.email)
      .filter((e): e is string => !!e);
    const takenEmails = new Set(
      (
        await this.prisma.user.findMany({
          where: { email: { in: emails } },
          select: { email: true },
        })
      ).map((u) => u.email),
    );
    const existingIds = new Set(existing.map((e) => e.idNumber));
    const toCreate = valid.filter((v) => {
      const errors = [
        existingIds.has(v.dto.idNumber) && 'idNumber sudah terdaftar',
        v.dto.email && takenEmails.has(v.dto.email) && 'email sudah dipakai',
      ].filter((x): x is string => !!x);
      if (errors.length)
        failed.push({ row: v.row, idNumber: v.dto.idNumber, errors });
      return errors.length === 0;
    });

    if (dryRun) {
      return {
        total: records.length,
        valid: toCreate.length,
        created: 0,
        failed: sortRows(failed),
        accounts: [],
      };
    }

    const created = [];
    for (const { row, dto } of toCreate) {
      const temporaryPassword = this.passwords.temporary();
      try {
        const m = await this.prisma.$transaction(async (tx) =>
          this.members.insert(
            tx,
            dto,
            await this.passwords.hash(temporaryPassword),
          ),
        );
        created.push({ ...presentMember(m), temporaryPassword });
      } catch (e) {
        failed.push({
          row,
          idNumber: dto.idNumber,
          errors: [(e as Error).message],
        });
      }
    }
    await this.audit.log({
      actorId,
      action: 'member.import',
      entityType: 'Member',
      metadata: {
        total: records.length,
        created: created.length,
        failed: failed.length,
      },
    });
    return {
      total: records.length,
      valid: created.length,
      // jumlah akun dibuat; detail + password sementara di accounts (untuk dicetak)
      created: created.length,
      failed: sortRows(failed),
      accounts: created,
    };
  }
}

const sortRows = (rows: ImportRowError[]) => rows.sort((a, b) => a.row - b.row);
