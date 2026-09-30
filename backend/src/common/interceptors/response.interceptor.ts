import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map } from 'rxjs';
import { Page } from '../pagination/pagination.schema.js';

/** Envelope sukses: { data, meta? }. Hasil paginate() membawa meta sendiri. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((result: unknown) => {
        if (result instanceof StreamableFile) return result;
        if (result instanceof Page)
          return { data: result.data, meta: result.meta };
        return { data: result ?? null };
      }),
    );
  }
}
