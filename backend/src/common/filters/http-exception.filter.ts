import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import { AppException } from '../errors.js';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE',
  429: 'TOO_MANY_REQUESTS',
};

/** Bentuk issue Standard Schema (Zod) yang dipakai di sini. */
interface Issue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
}

/** Issue validasi → `{ "field.path": ["pesan"] }` (dipetakan frontend ke field form). */
export function fieldErrors(issues: readonly Issue[]) {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key =
      issue.path
        ?.map((p) => String(typeof p === 'object' ? p.key : p))
        .join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export const validationException = (issues: readonly Issue[]) =>
  new AppException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_ERROR',
    'Input tidak valid',
    fieldErrors(issues),
  );

/**
 * Format error konsisten (dibaca `lib/api-client.ts` frontend):
 * { statusCode, errorCode, message, details? }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.normalize(exception);
    if (body.statusCode >= 500) this.logger.error(exception);
    res.status(body.statusCode).json(body);
  }

  private normalize(e: unknown) {
    if (e instanceof HttpException) {
      const statusCode = e.getStatus();
      const body = e.getResponse();
      const obj =
        typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>)
          : {};
      const message = obj.message ?? e.message;
      return {
        statusCode,
        errorCode:
          (obj.errorCode as string | undefined) ??
          CODE_BY_STATUS[statusCode] ??
          'ERROR',
        message: Array.isArray(message)
          ? message.join('; ')
          : typeof message === 'string'
            ? message
            : e.message,
        details: obj.details,
      };
    }
    // schema.parse() manual di service
    if (e instanceof ZodError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'VALIDATION_ERROR',
        message: 'Input tidak valid',
        details: fieldErrors(e.issues),
      };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        const target = e.meta?.target;
        const fields = Array.isArray(target) ? target.map(String) : [];
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'DUPLICATE',
          message: 'Data sudah ada',
          details: Object.fromEntries(
            fields.map((f) => [f, ['Sudah dipakai']]),
          ),
        };
      }
      if (e.code === 'P2025')
        return {
          statusCode: 404,
          errorCode: 'NOT_FOUND',
          message: 'Data tidak ditemukan',
          details: undefined,
        };
      if (e.code === 'P2003')
        return {
          statusCode: 409,
          errorCode: 'IN_USE',
          message: 'Data masih dipakai data lain',
          details: undefined,
        };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan pada server',
      details: undefined,
    };
  }
}
