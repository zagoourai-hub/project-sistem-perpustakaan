import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../../common/errors.js';
import type { Env } from '../../infra/config/env.schema.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface TokenSubject {
  id: string;
  role: 'ADMIN' | 'LIBRARIAN' | 'MEMBER';
  mustChangePassword: boolean;
  member: { id: string } | null;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const invalid = () =>
  new AppException(
    HttpStatus.UNAUTHORIZED,
    'REFRESH_INVALID',
    'Sesi berakhir, silakan masuk lagi',
  );

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get refreshTtlMs() {
    return this.config.get('REFRESH_TTL_DAYS', { infer: true }) * 86_400_000;
  }

  signAccess(u: TokenSubject) {
    return this.jwt.signAsync({
      sub: u.id,
      role: u.role,
      mid: u.member?.id ?? null,
      mcp: u.mustChangePassword,
    });
  }

  async issueRefresh(userId: string) {
    const raw = randomBytes(32).toString('base64url');
    const row = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });
    return { raw, id: row.id };
  }

  /** Rotasi: token lama dicabut. Pemakaian ulang token yang sudah dicabut = semua sesi user dicabut. */
  async rotate(raw: string) {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
    });
    if (!row) throw invalid();
    if (row.revokedAt) {
      await this.revokeAll(row.userId);
      throw invalid();
    }
    if (row.expiresAt < new Date()) throw invalid();
    const next = await this.issueRefresh(row.userId);
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: next.id },
    });
    if (count === 0) throw invalid(); // refresh paralel dengan token yang sama
    return { userId: row.userId, raw: next.raw };
  }

  revoke(raw: string) {
    return this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeAll(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
