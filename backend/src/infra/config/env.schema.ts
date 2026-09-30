import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().default('redis://localhost:6379'),
  // Origin frontend yang diizinkan, dipisah koma
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  // URL frontend, dipakai untuk link di email
  PORTAL_URL: z.url().default('http://localhost:3000'),
  APP_TIMEZONE: z.string().default('Asia/Jakarta'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().default(900),
  REFRESH_TTL_DAYS: z.coerce.number().default(7),
  COOKIE_SECURE: bool,
  COOKIE_DOMAIN: z.string().optional(),

  // URL publik backend (dipakai untuk link file storage lokal)
  PUBLIC_API_URL: z.url().default('http://localhost:3001'),
  // local = folder uploads/ (development), s3 = MinIO/S3 (production)
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('pustaka'),
  S3_SECRET_KEY: z.string().default('pustaka-secret'),
  S3_BUCKET: z.string().default('pustaka'),
  // Base URL publik untuk objek (cover). Default: endpoint/bucket
  S3_PUBLIC_URL: z.url().optional(),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: bool,
  MAIL_FROM: z.string().default('Pustaka <no-reply@pustaka.local>'),

  // Kosong = fitur AI mati, pencarian fallback ke full-text
  OPENROUTER_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
  EMBEDDING_DIMS: z.coerce.number().default(1536),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Env tidak valid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
