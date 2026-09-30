export const COOKIE = {
  access: 'access_token',
  refresh: 'refresh_token',
  // Tidak httpOnly: axios frontend menyalinnya ke header x-csrf-token (nama = frontend shared/constants.ts)
  csrf: 'csrf_token',
} as const;

export const CSRF_HEADER = 'x-csrf-token';
