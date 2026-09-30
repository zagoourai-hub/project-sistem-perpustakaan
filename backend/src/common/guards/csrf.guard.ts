import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { COOKIE, CSRF_HEADER } from '../cookies.js';
import { SKIP_CSRF } from '../decorators/public.decorator.js';
import { AppException } from '../errors.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Double-submit cookie: header x-csrf-token harus sama dengan cookie pustaka_csrf. */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE.has(req.method)) return true;
    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    ) {
      return true;
    }
    const cookie = req.cookies?.[COOKIE.csrf] as string | undefined;
    const header = req.header(CSRF_HEADER);
    if (
      cookie &&
      header &&
      cookie.length === header.length &&
      timingSafeEqual(Buffer.from(cookie), Buffer.from(header))
    ) {
      return true;
    }
    throw new AppException(
      HttpStatus.FORBIDDEN,
      'CSRF_INVALID',
      'Token CSRF tidak valid',
    );
  }
}
