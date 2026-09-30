// Seed idempoten: admin default, LoanPolicy STUDENT & STAFF, profil perpustakaan.
// Jalankan: pnpm prisma db seed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@pustaka.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Administrator',
      role: 'ADMIN',
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      mustChangePassword: true,
    },
  });

  const policies = {
    STUDENT: {
      maxActiveLoans: 3,
      loanDays: 7,
      maxRenewals: 1,
      finePerDay: 500,
      maxFinePerLoan: 20_000,
      blockingFineThreshold: 10_000,
      holdPickupDays: 3,
      maxActiveHolds: 2,
    },
    STAFF: {
      maxActiveLoans: 10,
      loanDays: 30,
      maxRenewals: 2,
      finePerDay: 500,
      maxFinePerLoan: 50_000,
      blockingFineThreshold: 25_000,
      holdPickupDays: 5,
      maxActiveHolds: 5,
    },
  } as const;
  for (const [memberType, data] of Object.entries(policies)) {
    await prisma.loanPolicy.upsert({
      where: { memberType: memberType as keyof typeof policies },
      update: {},
      create: { memberType: memberType as keyof typeof policies, ...data },
    });
  }

  await prisma.setting.upsert({
    where: { key: 'library' },
    update: {},
    create: {
      key: 'library',
      value: {
        institutionName: 'Perpustakaan',
        address: null,
        openingHours: 'Senin–Jumat 07.00–15.00',
        senderEmail: null,
        timezone: process.env.APP_TIMEZONE ?? 'Asia/Jakarta',
        logoKey: null,
        historyRetentionYears: 2,
      },
    },
  });

  console.log(`Seed selesai. Admin: ${email} (wajib ganti password saat login pertama)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
