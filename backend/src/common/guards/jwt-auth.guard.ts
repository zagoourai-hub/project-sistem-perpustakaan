import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { COOKIE } from '../cookies.js';
import {
  ALLOW_PENDING_PASSWORD,
  IS_PUBLIC,
} from '../decorators/public.decorator.js';
import type {
  AuthedRequest,
  AuthUser,
} from '../decorators/current-user.decorator.js';
import { AppException } from '../errors.js';

interface AccessPayload {
  sub: string;
  role: AuthUser['role'];
  mid: string | null;
  mcp: boolean;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC,
      targets,
    );
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = req.cookies?.[COOKIE.access] as string | undefined;

    if (token) {
      try {
        const p = await this.jwt.verifyAsync<AccessPayload>(token);
        req.user = {
          id: p.sub,
          role: p.role,
          memberId: p.mid,
          mustChangePassword: p.mcp,
        };
      } catch {
        // token kedaluwarsa/invalid: route publik tetap jalan sebagai guest
      }
    }
    if (isPublic) return true;
    if (!req.user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Silakan masuk terlebih dahulu',
      );
    }
    if (
      req.user.mustChangePassword &&
      !this.reflector.getAllAndOverride<boolean>(
        ALLOW_PENDING_PASSWORD,
        targets,
      )
    ) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'PASSWORD_CHANGE_REQUIRED',
        'Ganti password terlebih dahulu',
      );
    }
    return true;
  }
}
