import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../../generated/prisma/enums.js';
import type { AuthedRequest } from '../decorators/current-user.decorator.js';
import { ROLES } from '../decorators/roles.decorator.js';
import { AppException } from '../errors.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (user && roles.includes(user.role)) return true;
    throw new AppException(
      HttpStatus.FORBIDDEN,
      'FORBIDDEN',
      'Anda tidak punya akses ke fitur ini',
    );
  }
}
