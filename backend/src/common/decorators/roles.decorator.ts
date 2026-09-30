import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/enums.js';

export const ROLES = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
/** Shortcut untuk console staf. */
export const Staff = () => Roles('ADMIN', 'LIBRARIAN');
