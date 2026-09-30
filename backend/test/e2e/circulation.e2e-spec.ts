import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
// build dist: tsc memancarkan metadata DI yang tidak dihasilkan esbuild/vitest
import { AppModule } from '../../dist/app.module.js';
import { PrismaService } from '../../dist/infra/prisma/prisma.service.js';
import { OverdueFinesProcessor } from '../../dist/modules/fines/overdue-fines.processor.js';

const ADMIN = { identifier: 'admin@pustaka.local', password: 'Admin12345' };

/** Klien dengan cookie jar + header CSRF otomatis. */
function client(app: INestApplication) {
  const agent = request.agent(app.getHttpServer());
  let csrf = '';
  const track = (res: request.Response) => {
    const set = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const c = set.find((x) => x.startsWith('csrf_token='));
    if (c) csrf = c.split(';')[0].split('=')[1];
    return res;
  };
  return {
    get: (url: string) => agent.get(`/api/v1${url}`).then(track),
    post: (url: string, body: object = {}) =>
      agent
        .post(`/api/v1${url}`)
        .set('x-csrf-token', csrf)
        .send(body)
        .then(track),
  };
}

describe('Sirkulasi end-to-end', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let staff: ReturnType<typeof client>;
  let bookId: string;
  let barcode: string;
  let memberA: {
    id: string;
    memberCode: string;
    temporaryPassword: string;
    idNumber: string;
  };
  let memberB: { id: string; memberCode: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);
    staff = client(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('login admin wajib ganti password dulu', async () => {
    const login = await staff.post('/auth/login', ADMIN);
    expect(login.status).toBe(200);
    expect(login.body.data.mustChangePassword).toBe(true);
    expect((await staff.get('/members')).body.errorCode).toBe(
      'PASSWORD_CHANGE_REQUIRED',
    );
    const changed = await staff.post('/auth/change-password', {
      currentPassword: ADMIN.password,
      newPassword: 'Rahasia2026',
    });
    expect(changed.status).toBe(200);
  });

  it('mutasi tanpa header CSRF ditolak', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/holidays')
      .send({ date: '2026-12-25', name: 'Natal' });
    expect(res.status).toBe(401); // tanpa cookie → belum login
  });

  it('menyiapkan buku, eksemplar, dan dua anggota', async () => {
    const book = await staff.post('/books', {
      title: 'Bumi Manusia',
      authors: ['Pramoedya Ananta Toer'],
      subjects: ['Novel'],
    });
    expect(book.status).toBe(201);
    bookId = book.body.data.id;
    const shelf = await staff.post('/master-data/shelf-locations', {
      code: 'B-04',
      name: 'Fiksi Indonesia',
    });
    const items = await staff.post(`/books/${bookId}/items`, {
      count: 1,
      price: 75000,
      shelfLocationId: shelf.body.data.id,
    });
    barcode = items.body.data[0].barcode;
    expect(barcode).toMatch(/^PST-\d{4}-\d{6}$/);

    const a = await staff.post('/members', {
      name: 'Anggota A',
      idNumber: 'E2E-A',
      type: 'STUDENT',
      validUntil: '2030-01-01',
    });
    const b = await staff.post('/members', {
      name: 'Anggota B',
      idNumber: 'E2E-B',
      type: 'STUDENT',
      validUntil: '2030-01-01',
    });
    memberA = a.body.data;
    memberB = b.body.data;
    expect(memberA.memberCode).toMatch(/^AGT-\d{4}-\d{6}$/);
  });

  it('checkout paralel eksemplar yang sama: hanya satu berhasil (FR-E5)', async () => {
    const [r1, r2] = await Promise.all([
      staff.post('/circulation/checkout', {
        memberCode: memberA.memberCode,
        barcodes: [barcode],
      }),
      staff.post('/circulation/checkout', {
        memberCode: memberB.memberCode,
        barcodes: [barcode],
      }),
    ]);
    // dua-duanya 201; tepat satu meminjam, satunya ditolak per eksemplar
    const bodies = [r1.body.data, r2.body.data];
    expect(bodies.map((b) => b.loans.length).sort((x, y) => x - y)).toEqual([
      0, 1,
    ]);
    expect(bodies.flatMap((b) => b.rejected).length).toBe(1);
    expect(bodies.find((b) => b.loans.length).loans[0].item.barcode).toBe(
      barcode,
    );
    expect(await prisma.loan.count({ where: { returnedAt: null } })).toBe(1);

    // pastikan A pemegang pinjaman untuk langkah berikutnya
    const loan = await prisma.loan.findFirstOrThrow({
      where: { returnedAt: null },
    });
    if (loan.memberId !== memberA.id) {
      [memberA, memberB] = [memberB as typeof memberA, memberA];
    }
  });

  it('anggota lain mereservasi judul yang sedang dipinjam', async () => {
    const hold = await staff.post('/holds', { bookId, memberId: memberB.id });
    expect(hold.status).toBe(201);
    expect(hold.body.data.queuePosition).toBe(1);
    const again = await staff.post('/holds', { bookId, memberId: memberB.id });
    expect(again.body.errorCode).toBe('ALREADY_HELD');
  });

  it('pinjaman overdue: perpanjang ditolak, job denda harian menghitung denda berjalan', async () => {
    await prisma.loan.updateMany({
      where: { returnedAt: null },
      data: { dueAt: new Date(Date.now() - 3 * 86_400_000 - 3_600_000) },
    });
    const loan = await prisma.loan.findFirstOrThrow({
      where: { returnedAt: null },
    });
    const renew = await staff.post(`/loans/${loan.id}/renew`);
    expect(renew.body.errorCode).toBe('RENEW_REJECTED');

    await app.get(OverdueFinesProcessor).process();
    const fine = await prisma.fine.findFirstOrThrow({
      where: { loanId: loan.id, type: 'OVERDUE' },
    });
    expect(fine.amount).toBeGreaterThanOrEqual(1500); // 3–4 hari × Rp500 tergantung jam
  });

  it('checkin: tutup pinjaman, denda, eksemplar disimpan untuk antrean reservasi', async () => {
    const res = await staff.post('/circulation/checkin', { barcode });
    expect(res.status).toBe(200);
    expect(res.body.data.fine.amount).toBeGreaterThan(0);
    expect(res.body.data.itemStatus).toBe('ON_HOLD');
    expect(res.body.data.heldFor.memberId).toBe(memberB.id);
    expect(res.body.data.loan.item.book.id).toBe(bookId);
    expect(await prisma.fine.count({ where: { type: 'OVERDUE' } })).toBe(1); // tidak dobel dengan job

    const twice = await staff.post('/circulation/checkin', { barcode });
    expect(twice.body.errorCode).toBe('NO_ACTIVE_LOAN');
  });

  it('eksemplar ON_HOLD hanya bisa dipinjam pemilik reservasi', async () => {
    const other = await staff.post('/circulation/checkout', {
      memberCode: memberA.memberCode,
      barcodes: [barcode],
    });
    expect(other.body.data.loans).toHaveLength(0);
    expect(other.body.data.rejected[0].reasons[0]).toMatch(
      /reservasi anggota lain/,
    );

    const owner = await staff.post('/circulation/checkout', {
      memberCode: memberB.memberCode,
      barcodes: [barcode],
    });
    expect(owner.status).toBe(201);
    const hold = await prisma.hold.findFirstOrThrow({
      where: { memberId: memberB.id },
    });
    expect(hold.status).toBe('FULFILLED');
  });

  it('pembayaran denda parsial lalu lunas', async () => {
    const fine = await prisma.fine.findFirstOrThrow({
      where: { type: 'OVERDUE' },
    });
    const part = await staff.post(`/fines/${fine.id}/payments`, {
      amount: 500,
    });
    expect(part.body.data.amount).toBe(500);
    expect(part.body.data.fine.status).toBe('UNPAID');
    expect(part.body.data.fine.outstanding).toBe(fine.amount - 500);
    const over = await staff.post(`/fines/${fine.id}/payments`, {
      amount: fine.amount,
    });
    expect(over.body.errorCode).toBe('AMOUNT_EXCEEDS');
    const rest = await staff.post(`/fines/${fine.id}/payments`, {
      amount: fine.amount - 500,
    });
    expect(rest.body.data.fine.status).toBe('PAID');
  });

  it('portal anggota: hanya data milik sendiri', async () => {
    const member = client(app);
    const login = await member.post('/auth/login', {
      identifier: memberA.idNumber,
      password: memberA.temporaryPassword,
    });
    expect(login.status).toBe(200);
    await member.post('/auth/change-password', {
      currentPassword: memberA.temporaryPassword,
      newPassword: 'Anggota2026',
    });
    const history = await member.get('/me/history');
    expect(history.body.meta.total).toBe(1);
    expect((await member.get('/members')).status).toBe(403);
    const me = await member.get('/auth/me');
    expect(me.body.data.memberId).toBe(memberA.id);
  });

  it('pencarian full-text toleran typo', async () => {
    const res = await staff.get('/search?q=bumi%20manusa');
    expect(res.body.data.items.map((b: { id: string }) => b.id)).toContain(
      bookId,
    );
    expect(res.body.data.semanticAvailable).toBe(false);
  });

  it('error validasi: body datar + details per field (applyServerErrors frontend)', async () => {
    const res = await staff.post('/members', { name: '', type: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.details)).toEqual(
      expect.arrayContaining(['name', 'idNumber', 'type']),
    );
    expect(res.body.details.name[0]).toBeTypeOf('string');
  });

  it('lookup eksemplar → ItemWithBook, label barcode → PDF', async () => {
    const item = await staff.get(`/items/lookup?barcode=${barcode}`);
    expect(item.body.data.book.id).toBe(bookId);
    expect(item.body.data).toHaveProperty('heldForMemberId');
    const pdf = await staff.get(`/items/labels?ids=${item.body.data.id}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
  });
});
