import { HttpException, HttpStatus } from '@nestjs/common';

// Error domain dengan errorCode stabil yang bisa di-switch oleh frontend.
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly errorCode: string,
    message: string,
    readonly details?: unknown,
  ) {
    super({ errorCode, message, details }, status);
  }
}

export const notFound = (what: string) =>
  new AppException(
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    `${what} tidak ditemukan`,
  );
export const conflict = (code: string, message: string, details?: unknown) =>
  new AppException(HttpStatus.CONFLICT, code, message, details);
export const unprocessable = (
  code: string,
  message: string,
  details?: unknown,
) => new AppException(HttpStatus.UNPROCESSABLE_ENTITY, code, message, details);
