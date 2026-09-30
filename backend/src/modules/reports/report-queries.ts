import type { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface ReportRange {
  from: Date;
  to: Date; // eksklusif
  tz: string;
  limit: number;
}

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'date';
}

export interface ReportResult {
  title: string;
  columns: Column[];
  rows: Record<string, string | number | Date | null>[];
}

type Q = (db: PrismaService, r: ReportRange) => Promise<ReportResult>;

const num = (v: bigint | number | null) => Number(v ?? 0);

/** Satu fungsi query per laporan (FR-K2). Semua rentang [from, to). */
export const REPORTS = {
  circulation: async (db, r) => {
    const rows = await db.$queryRaw<
      { day: Date; checkouts: bigint; returns: bigint }[]
    >`
      WITH days AS (
        SELECT generate_series(
          (${r.from}::timestamptz AT TIME ZONE ${r.tz})::date,
          ((${r.to}::timestamptz - interval '1 second') AT TIME ZONE ${r.tz})::date,
          interval '1 day')::date AS day
      )
      SELECT d.day,
        (SELECT count(*) FROM "Loan" l WHERE (l."checkedOutAt" AT TIME ZONE ${r.tz})::date = d.day) AS checkouts,
        (SELECT count(*) FROM "Loan" l WHERE (l."returnedAt" AT TIME ZONE ${r.tz})::date = d.day) AS returns
      FROM days d ORDER BY d.day`;
    return {
      title: 'Sirkulasi per hari',
      columns: [
        { key: 'day', label: 'Tanggal', type: 'date' },
        { key: 'checkouts', label: 'Peminjaman', type: 'number' },
        { key: 'returns', label: 'Pengembalian', type: 'number' },
      ],
      rows: rows.map((x) => ({
        day: x.day,
        checkouts: num(x.checkouts),
        returns: num(x.returns),
      })),
    };
  },

  popular: async (db, r) => {
    const rows = await db.$queryRaw<
      { id: string; title: string; callNumber: string | null; loans: bigint }[]
    >`
      SELECT b.id, b.title, b."callNumber", count(*) AS loans
      FROM "Loan" l JOIN "Item" i ON i.id = l."itemId" JOIN "Book" b ON b.id = i."bookId"
      WHERE l."checkedOutAt" >= ${r.from} AND l."checkedOutAt" < ${r.to}
      GROUP BY b.id ORDER BY loans DESC, b.title LIMIT ${r.limit}`;
    return {
      title: 'Koleksi terpopuler',
      columns: [
        { key: 'title', label: 'Judul' },
        { key: 'callNumber', label: 'Nomor panggil' },
        { key: 'loans', label: 'Jumlah pinjam', type: 'number' },
      ],
      rows: rows.map((x) => ({
        id: x.id,
        title: x.title,
        callNumber: x.callNumber,
        loans: num(x.loans),
      })),
    };
  },

  'dead-stock': async (db, r) => {
    // tidak pernah dipinjam sama sekali, sudah di rak sebelum akhir periode
    const rows = await db.$queryRaw<
      {
        id: string;
        title: string;
        callNumber: string | null;
        items: bigint;
        acquired: Date;
      }[]
    >`
      SELECT b.id, b.title, b."callNumber", count(i.id) AS items, min(i."acquiredAt") AS acquired
      FROM "Book" b JOIN "Item" i ON i."bookId" = b.id AND i."deletedAt" IS NULL
      WHERE b."deletedAt" IS NULL AND i."acquiredAt" < ${r.to}
        AND NOT EXISTS (SELECT 1 FROM "Loan" l JOIN "Item" i2 ON i2.id = l."itemId" WHERE i2."bookId" = b.id)
      GROUP BY b.id ORDER BY acquired ASC LIMIT ${r.limit}`;
    return {
      title: 'Koleksi tidak pernah dipinjam',
      columns: [
        { key: 'title', label: 'Judul' },
        { key: 'callNumber', label: 'Nomor panggil' },
        { key: 'items', label: 'Eksemplar', type: 'number' },
        { key: 'acquired', label: 'Masuk sejak', type: 'date' },
      ],
      rows: rows.map((x) => ({ ...x, items: num(x.items) })),
    };
  },

  'active-members': async (db, r) => {
    const rows = await db.$queryRaw<
      {
        memberCode: string;
        name: string;
        classOrMajor: string | null;
        loans: bigint;
      }[]
    >`
      SELECT m."memberCode", u.name, m."classOrMajor", count(*) AS loans
      FROM "Loan" l JOIN "Member" m ON m.id = l."memberId" JOIN "User" u ON u.id = m."userId"
      WHERE l."checkedOutAt" >= ${r.from} AND l."checkedOutAt" < ${r.to}
      GROUP BY m.id, u.name ORDER BY loans DESC, u.name LIMIT ${r.limit}`;
    return {
      title: 'Anggota teraktif',
      columns: [
        { key: 'memberCode', label: 'Kode anggota' },
        { key: 'name', label: 'Nama' },
        { key: 'classOrMajor', label: 'Kelas/Prodi' },
        { key: 'loans', label: 'Jumlah pinjam', type: 'number' },
      ],
      rows: rows.map((x) => ({ ...x, loans: num(x.loans) })),
    };
  },

  'by-class': async (db, r) => {
    const rows = await db.$queryRaw<
      {
        classOrMajor: string | null;
        members: bigint;
        borrowers: bigint;
        loans: bigint;
      }[]
    >`
      SELECT coalesce(m."classOrMajor", '(tanpa kelas)') AS "classOrMajor",
        count(DISTINCT m.id) AS members,
        count(DISTINCT l."memberId") AS borrowers,
        count(l.id) AS loans
      FROM "Member" m
      LEFT JOIN "Loan" l ON l."memberId" = m.id AND l."checkedOutAt" >= ${r.from} AND l."checkedOutAt" < ${r.to}
      GROUP BY 1 ORDER BY loans DESC, 1`;
    return {
      title: 'Sirkulasi per kelas/prodi',
      columns: [
        { key: 'classOrMajor', label: 'Kelas/Prodi' },
        { key: 'members', label: 'Anggota', type: 'number' },
        { key: 'borrowers', label: 'Anggota meminjam', type: 'number' },
        { key: 'loans', label: 'Jumlah pinjam', type: 'number' },
      ],
      rows: rows.map((x) => ({
        classOrMajor: x.classOrMajor,
        members: num(x.members),
        borrowers: num(x.borrowers),
        loans: num(x.loans),
      })),
    };
  },

  fines: async (db, r) => {
    const rows = await db.$queryRaw<
      {
        paidAt: Date;
        amount: number;
        type: string;
        title: string;
        name: string | null;
        memberCode: string | null;
      }[]
    >`
      SELECT p."paidAt", p.amount, f.type::text AS type, b.title, u.name, m."memberCode"
      FROM "FinePayment" p
      JOIN "Fine" f ON f.id = p."fineId"
      JOIN "Loan" l ON l.id = f."loanId"
      JOIN "Item" i ON i.id = l."itemId" JOIN "Book" b ON b.id = i."bookId"
      LEFT JOIN "Member" m ON m.id = l."memberId" LEFT JOIN "User" u ON u.id = m."userId"
      WHERE p."paidAt" >= ${r.from} AND p."paidAt" < ${r.to}
      ORDER BY p."paidAt" DESC`;
    return {
      title: 'Denda terkumpul',
      columns: [
        { key: 'paidAt', label: 'Tanggal bayar', type: 'date' },
        { key: 'memberCode', label: 'Kode anggota' },
        { key: 'name', label: 'Nama' },
        { key: 'title', label: 'Judul' },
        { key: 'type', label: 'Jenis' },
        { key: 'amount', label: 'Nominal', type: 'currency' },
      ],
      rows,
    };
  },

  'lost-damaged': async (db, r) => {
    const rows = await db.$queryRaw<
      {
        date: Date;
        type: string;
        barcode: string;
        title: string;
        amount: number;
        status: string;
        name: string | null;
      }[]
    >`
      SELECT f."createdAt" AS date, f.type::text AS type, i.barcode, b.title, f.amount, f.status::text AS status, u.name
      FROM "Fine" f
      JOIN "Loan" l ON l.id = f."loanId"
      JOIN "Item" i ON i.id = l."itemId" JOIN "Book" b ON b.id = i."bookId"
      LEFT JOIN "Member" m ON m.id = l."memberId" LEFT JOIN "User" u ON u.id = m."userId"
      WHERE f.type IN ('LOST', 'DAMAGED') AND f."createdAt" >= ${r.from} AND f."createdAt" < ${r.to}
      ORDER BY f."createdAt" DESC`;
    return {
      title: 'Eksemplar hilang/rusak',
      columns: [
        { key: 'date', label: 'Tanggal', type: 'date' },
        { key: 'type', label: 'Jenis' },
        { key: 'barcode', label: 'Barcode' },
        { key: 'title', label: 'Judul' },
        { key: 'name', label: 'Peminjam' },
        { key: 'amount', label: 'Denda', type: 'currency' },
        { key: 'status', label: 'Status denda' },
      ],
      rows,
    };
  },
} satisfies Record<string, Q>;

export type ReportType = keyof typeof REPORTS;
export const REPORT_TYPES = Object.keys(REPORTS) as [
  ReportType,
  ...ReportType[],
];
