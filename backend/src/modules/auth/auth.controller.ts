import { randomBytes } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { COOKIE } from '../../common/cookies.js';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import {
  AllowPendingPassword,
  Public,
  SkipCsrf,
} from '../../common/decorators/public.decorator.js';
import type { Env } from '../../infra/config/env.schema.js';
import { AuthService } from './auth.service.js';
import {
  type ChangePasswordDto,
  changePasswordSchema,
} from './dto/change-password.dto.js';
import { type LoginDto, loginSchema } from './dto/login.dto.js';

/** SessionUser frontend: profil + memberId datar. */
const session = <T extends { member: { id: string } | null }>(p: T) => ({
  ...p,
  memberId: p.member?.id ?? null,
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body({ schema: loginSchema }) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.auth.login(dto, req.ip ?? 'unknown');
    this.setCookies(res, r.accessToken, r.refreshToken);
    return session(r.profile);
  }

  // Tanpa CSRF: hanya merotasi token milik pemegang cookie (respons tak terbaca lintas-situs,
  // cookie SameSite=Lax), dan cookie basi tanpa csrf_token harus tetap bisa dibersihkan.
  @Public()
  @SkipCsrf()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const r = await this.auth.refresh(
        req.cookies?.[COOKIE.refresh] as string | undefined,
      );
      this.setCookies(res, r.accessToken, r.refreshToken);
      return session(r.profile);
    } catch (e) {
      this.clearCookies(res);
      throw e;
    }
  }

  @Public()
  @SkipCsrf()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE.refresh] as string | undefined);
    this.clearCookies(res);
    return { ok: true };
  }

  @AllowPendingPassword()
  @Post('change-password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body({ schema: changePasswordSchema }) dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.auth.changePassword(user.id, dto);
    this.setCookies(res, r.accessToken, r.refreshToken);
    return session(r.profile);
  }

  @AllowPendingPassword()
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return session(await this.auth.me(user.id));
  }

  private base(): CookieOptions {
    return {
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
      path: '/',
    };
  }

  private setCookies(res: Response, access: string, refresh: string) {
    const refreshMs =
      this.config.get('REFRESH_TTL_DAYS', { infer: true }) * 86_400_000;
    res.cookie(COOKIE.access, access, {
      ...this.base(),
      httpOnly: true,
      maxAge: this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }) * 1000,
    });
    res.cookie(COOKIE.refresh, refresh, {
      ...this.base(),
      httpOnly: true,
      path: '/api/v1/auth',
      maxAge: refreshMs,
    });
    res.cookie(COOKIE.csrf, randomBytes(24).toString('base64url'), {
      ...this.base(),
      httpOnly: false,
      maxAge: refreshMs,
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie(COOKIE.access, this.base());
    res.clearCookie(COOKIE.refresh, { ...this.base(), path: '/api/v1/auth' });
    res.clearCookie(COOKIE.csrf, this.base());
  }
}
