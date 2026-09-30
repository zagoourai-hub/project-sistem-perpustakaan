import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bisa dipanggil dengan client transaksi agar log ikut atomik. */
  log(
    entry: AuditEntry,
    db: Pick<Prisma.TransactionClient, 'auditLog'> = this.prisma,
  ) {
    return db.auditLog.create({ data: entry });
  }
}
