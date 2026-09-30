import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Route tanpa login. Bila ada cookie valid, user tetap terisi (optional auth). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ALLOW_PENDING_PASSWORD = 'allowPendingPassword';
/** Route yang tetap boleh diakses saat user wajib ganti password. */
export const AllowPendingPassword = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD, true);

export const SKIP_CSRF = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);
