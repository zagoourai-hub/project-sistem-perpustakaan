import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { z } from 'zod';
import { AppModule, ObserveInstrument } from './app.module.js';
import type { Env } from './infra/config/env.schema.js';
import { LOCAL_UPLOAD_DIR } from './infra/storage/storage.service.js';

// pesan validasi dalam Bahasa Indonesia
z.config(z.locales.id());

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  app.set('trust proxy', 1);
  // cover di-load dari origin frontend
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
    exposedHeaders: ['x-request-id', 'content-disposition'],
  });
  app.setGlobalPrefix('api/v1');
  if (config.get('STORAGE_DRIVER', { infer: true }) === 'local') {
    app.useStaticAssets(LOCAL_UPLOAD_DIR, { prefix: '/uploads', maxAge: '7d' });
  }
  app.enableShutdownHooks();
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
