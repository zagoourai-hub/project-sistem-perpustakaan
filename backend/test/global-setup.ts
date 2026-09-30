import { execSync } from 'node:child_process';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * DB e2e terpisah: <DATABASE_URL>_test. Dibuat bila belum ada, dimigrasi,
 * lalu dikosongkan dan di-seed ulang setiap run.
 */
export default async function setup() {
  const base = new URL(process.env.DATABASE_URL!);
  const testUrl = new URL(base);
  testUrl.pathname = `${base.pathname}_test`;
  const dbName = testUrl.pathname.slice(1);

  const admin = new URL(base);
  admin.pathname = '/postgres';
  const root = new PrismaClient({
    adapter: new PrismaPg({ connectionString: admin.toString() }),
  });
  const exists = await root.$queryRaw<
    unknown[]
  >`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
  if (!exists.length)
    await root.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  await root.$disconnect();

  const env = { ...process.env, DATABASE_URL: testUrl.toString() };
  execSync('node ./node_modules/prisma/build/index.js migrate deploy', {
    env,
    stdio: 'ignore',
  });

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: testUrl.toString() }),
  });
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  await db.$disconnect();
  execSync('node --import tsx prisma/seed.ts', { env, stdio: 'ignore' });
}

/** Dipakai spec agar menunjuk DB yang sama dengan setup. */
export function testDatabaseUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}
