import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  paginate,
  paginationSchema,
} from '../../common/pagination/pagination.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

const auditQuerySchema = paginationSchema.extend({
  actorId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
type AuditQuery = z.infer<typeof auditQuerySchema>;

@Roles('ADMIN')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  search(@Query({ schema: auditQuerySchema }) q: AuditQuery) {
    const where: Prisma.AuditLogWhereInput = {
      actorId: q.actorId,
      action: q.action ? { startsWith: q.action } : undefined,
      entityType: q.entityType,
      entityId: q.entityId,
      createdAt: { gte: q.from, lte: q.to },
    };
    return paginate(
      q,
      async (p) => {
        const rows = await this.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          ...p,
        });
        const ids = [
          ...new Set(rows.flatMap((r) => (r.actorId ? [r.actorId] : []))),
        ];
        const users = await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        const byId = new Map(users.map((u) => [u.id, u]));
        return rows.map((r) => ({
          ...r,
          actor: r.actorId ? (byId.get(r.actorId) ?? null) : null,
        }));
      },
      () => this.prisma.auditLog.count({ where }),
    );
  }
}
