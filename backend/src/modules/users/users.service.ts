import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../../common/errors.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PasswordService } from '../auth/password.service.js';
import { TokenService } from '../auth/token.service.js';
import type {
  CreateStaffDto,
  StaffQuery,
  UpdateStaffDto,
} from './dto/user.dto.js';

const staffSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  list(q: StaffQuery) {
    const where: Prisma.UserWhereInput = {
      role: q.role ?? { in: ['ADMIN', 'LIBRARIAN'] },
      OR: q.q
        ? [
            { name: { contains: q.q, mode: 'insensitive' } },
            { email: { contains: q.q, mode: 'insensitive' } },
          ]
        : undefined,
    };
    // staf hanya segelintir: kembalikan array utuh
    return this.prisma.user.findMany({
      where,
      select: staffSelect,
      orderBy: { name: 'asc' },
    });
  }

  async create(actorId: string, dto: CreateStaffDto) {
    const temporaryPassword = dto.password
      ? undefined
      : this.passwords.temporary();
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        passwordHash: await this.passwords.hash(
          dto.password ?? temporaryPassword!,
        ),
        mustChangePassword: !dto.password,
      },
      select: staffSelect,
    });
    await this.audit.log({
      actorId,
      action: 'staff.create',
      entityType: 'User',
      entityId: user.id,
    });
    return { ...user, temporaryPassword };
  }

  async update(actorId: string, id: string, dto: UpdateStaffDto) {
    await this.findStaff(id);
    if (
      id === actorId &&
      (dto.isActive === false || (dto.role && dto.role !== 'ADMIN'))
    ) {
      throw conflict(
        'SELF_LOCKOUT',
        'Tidak bisa menonaktifkan atau menurunkan role akun sendiri',
      );
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: staffSelect,
    });
    if (dto.isActive === false) await this.tokens.revokeAll(id);
    await this.audit.log({
      actorId,
      action: 'staff.update',
      entityType: 'User',
      entityId: id,
      metadata: dto,
    });
    return user;
  }

  /** FR-A5: reset oleh staf → password sementara, wajib ganti saat login. Dipakai juga untuk anggota. */
  async resetPassword(actorId: string, userId: string) {
    const temporaryPassword = this.passwords.temporary();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await this.passwords.hash(temporaryPassword),
        mustChangePassword: true,
      },
    });
    await this.tokens.revokeAll(userId);
    await this.audit.log({
      actorId,
      action: 'user.reset_password',
      entityType: 'User',
      entityId: userId,
    });
    return { temporaryPassword };
  }

  private async findStaff(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: { in: ['ADMIN', 'LIBRARIAN'] } },
    });
    if (!user) throw notFound('Staf');
    return user;
  }
}
