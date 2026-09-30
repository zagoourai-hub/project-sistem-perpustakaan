import { HttpStatus, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AppException } from '../../common/errors.js';
import { InjectRedis } from '../../infra/redis/redis.module.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { PasswordService } from './password.service.js';
import { TokenService, type TokenSubject } from './token.service.js';

const MAX_FAILS = 5;
const FAIL_WINDOW_S = 15 * 60;

export const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  mustChangePassword: true,
  member: {
    select: {
      id: true,
      memberCode: true,
      idNumber: true,
      type: true,
      classOrMajor: true,
      status: true,
      validUntil: true,
      emailReminders: true,
    },
  },
} as const;

const invalidSession = () =>
  new AppException(
    HttpStatus.UNAUTHORIZED,
    'REFRESH_INVALID',
    'Sesi berakhir, silakan masuk lagi',
  );

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /** Rate limit login: 5 gagal / 15 menit per akun+IP (Redis). */
  async login(dto: LoginDto, ip: string) {
    const identifier = dto.identifier.toLowerCase();
    const throttleKey = `login:fail:${identifier}:${ip}`;
    const fails = Number(await this.redis.get(throttleKey));
    if (fails >= MAX_FAILS) {
      const ttl = await this.redis.ttl(throttleKey);
      throw new AppException(
        HttpStatus.TOO_MANY_REQUESTS,
        'LOGIN_LOCKED',
        `Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(ttl / 60))} menit`,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { email: identifier },
          { member: { idNumber: dto.identifier } },
          { member: { memberCode: dto.identifier.toUpperCase() } },
        ],
      },
      select: { ...profileSelect, passwordHash: true },
    });
    if (
      !user ||
      !(await this.passwords.verify(user.passwordHash, dto.password))
    ) {
      await this.redis
        .multi()
        .incr(throttleKey)
        .expire(throttleKey, FAIL_WINDOW_S)
        .exec();
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email/nomor induk atau password salah',
      );
    }

    await this.redis.del(throttleKey);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log({
      actorId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      ip,
    });
    const { passwordHash: _hash, ...profile } = user;
    return { profile, ...(await this.issue(profile)) };
  }

  async refresh(raw: string | undefined) {
    if (!raw) throw invalidSession();
    const rotated = await this.tokens.rotate(raw);
    const { isActive, ...profile } = await this.prisma.user.findUniqueOrThrow({
      where: { id: rotated.userId },
      select: { ...profileSelect, isActive: true },
    });
    if (!isActive) {
      await this.tokens.revokeAll(profile.id);
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'ACCOUNT_DISABLED',
        'Akun dinonaktifkan',
      );
    }
    return {
      profile,
      accessToken: await this.tokens.signAccess(profile),
      refreshToken: rotated.raw,
    };
  }

  async logout(raw: string | undefined) {
    if (raw) await this.tokens.revoke(raw);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (
      !(await this.passwords.verify(user.passwordHash, dto.currentPassword))
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'WRONG_PASSWORD',
        'Password lama salah',
      );
    }
    const profile = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await this.passwords.hash(dto.newPassword),
        mustChangePassword: false,
      },
      select: profileSelect,
    });
    // cabut semua sesi lain, terbitkan sesi baru untuk perangkat ini
    await this.tokens.revokeAll(userId);
    await this.audit.log({
      actorId: userId,
      action: 'auth.change_password',
      entityType: 'User',
      entityId: userId,
    });
    return { profile, ...(await this.issue(profile)) };
  }

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: profileSelect,
    });
  }

  private async issue(subject: TokenSubject) {
    const accessToken = await this.tokens.signAccess(subject);
    const { raw } = await this.tokens.issueRefresh(subject.id);
    return { accessToken, refreshToken: raw };
  }
}
