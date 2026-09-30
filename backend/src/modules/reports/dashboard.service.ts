import { Injectable } from '@nestjs/common';
import {
  addDays,
  dbDate,
  lateDays,
  startOfLocalDay,
  toLocalDate,
} from '../../common/utils/date.util.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { bookCardSelect, BookPresenter } from '../catalog/book.presenter.js';
import { HolidaysService } from '../policies/holidays.service.js';
import { PoliciesService } from '../policies/policies.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { REPORTS } from './report-queries.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly holidays: HolidaysService,
    private readonly policies: PoliciesService,
    private readonly books: BookPresenter,
  ) {}

  /** Dasbor staf (FR-K1): 5 KPI + delta vs kemarin, terlambat, siap diambil, grafik 14 hari, populer, aktivitas. */
  async staff() {
    const tz = await this.settings.timezone();
    const now = new Date();
    const today = toLocalDate(now, tz);
    const start = startOfLocalDay(today, tz);
    const yStart = startOfLocalDay(addDays(today, -1), tz);
    const tomorrow = startOfLocalDay(addDays(today, 1), tz);
    const monthStart = startOfLocalDay(`${today.slice(0, 8)}01`, tz);

    const [
      loansToday,
      loansYesterday,
      returnsToday,
      returnsYesterday,
      overdueActive,
      holdsReady,
      fines,
      finesToday,
      overdue,
      ready,
      series,
      popular,
      activity,
    ] = await Promise.all([
      this.prisma.loan.count({ where: { checkedOutAt: { gte: start } } }),
      this.prisma.loan.count({
        where: { checkedOutAt: { gte: yStart, lt: start } },
      }),
      this.prisma.loan.count({ where: { returnedAt: { gte: start } } }),
      this.prisma.loan.count({
        where: { returnedAt: { gte: yStart, lt: start } },
      }),
      this.prisma.loan.count({
        where: { returnedAt: null, dueAt: { lt: now } },
      }),
      this.prisma.hold.count({ where: { status: 'READY' } }),
      this.prisma.fine.aggregate({
        where: { status: 'UNPAID' },
        _sum: { amount: true, paidAmount: true },
      }),
      this.prisma.fine.aggregate({
        where: { createdAt: { gte: start } },
        _sum: { amount: true },
      }),
      this.prisma.loan.findMany({
        where: { returnedAt: null, dueAt: { lt: now } },
        orderBy: { dueAt: 'asc' },
        take: 10,
        select: {
          id: true,
          dueAt: true,
          item: {
            select: {
              barcode: true,
              book: { select: { id: true, title: true } },
            },
          },
          member: {
            select: {
              id: true,
              memberCode: true,
              classOrMajor: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.hold.findMany({
        where: { status: 'READY' },
        orderBy: { expiresAt: 'asc' },
        take: 9,
        select: {
          id: true,
          expiresAt: true,
          book: { select: { id: true, title: true } },
          item: { select: { barcode: true } },
          member: {
            select: { memberCode: true, user: { select: { name: true } } },
          },
        },
      }),
      REPORTS.circulation(this.prisma, {
        from: startOfLocalDay(addDays(today, -13), tz),
        to: tomorrow,
        tz,
        limit: 14,
      }),
      REPORTS.popular(this.prisma, {
        from: monthStart,
        to: tomorrow,
        tz,
        limit: 5,
      }),
      this.prisma.auditLog.findMany({
        where: { action: { startsWith: 'circulation.' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          createdAt: true,
          metadata: true,
          actorId: true,
        },
      }),
    ]);

    const holidays = await this.holidays.set();
    return {
      date: today,
      // DashboardKpis frontend (datar) + delta vs kemarin
      loansToday,
      returnsToday,
      overdueActive,
      holdsReady,
      unpaidFinesTotal: (fines._sum.amount ?? 0) - (fines._sum.paidAmount ?? 0),
      unpaidFinesToday: finesToday._sum.amount ?? 0,
      deltas: {
        loansToday: loansToday - loansYesterday,
        returnsToday: returnsToday - returnsYesterday,
      },
      overdue: overdue.map((l) => ({
        ...l,
        daysOverdue: Math.max(1, lateDays(l.dueAt, now, holidays, tz)),
      })),
      ready: ready.map((h) => ({
        ...h,
        expiresToday: !!h.expiresAt && toLocalDate(h.expiresAt, tz) === today,
      })),
      // hari tutup = hari libur (bar pucat di grafik)
      checkouts14d: series.rows.map((r) => {
        const d = dbDate(r.day as Date);
        return {
          date: d,
          checkouts: r.checkouts,
          returns: r.returns,
          closed: holidays.has(d),
          today: d === today,
        };
      }),
      popularThisMonth: popular.rows,
      activity: await this.withActorNames(activity),
    };
  }

  private async withActorNames<T extends { actorId: string | null }>(
    rows: T[],
  ) {
    const ids = [
      ...new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x)),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const names = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({
      ...r,
      actorName: r.actorId ? (names.get(r.actorId) ?? null) : null,
    }));
  }

  /** Beranda OPAC publik: statistik, baru di rak, paling dipinjam, subjek, jam buka & aturan pinjam. */
  async opac() {
    const tz = await this.settings.timezone();
    const today = toLocalDate(new Date(), tz);
    const monthStart = startOfLocalDay(`${today.slice(0, 8)}01`, tz);
    const tomorrow = startOfLocalDay(addDays(today, 1), tz);

    const [
      titles,
      items,
      available,
      members,
      newest,
      popular,
      subjects,
      policies,
      library,
    ] = await Promise.all([
      this.prisma.book.count({ where: { deletedAt: null } }),
      this.prisma.item.count({
        where: { deletedAt: null, status: { notIn: ['LOST', 'WITHDRAWN'] } },
      }),
      this.prisma.item.count({
        where: { deletedAt: null, status: 'AVAILABLE' },
      }),
      this.prisma.member.count({ where: { status: 'ACTIVE' } }),
      this.prisma.book.findMany({
        where: { deletedAt: null, items: { some: { deletedAt: null } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: bookCardSelect,
      }),
      REPORTS.popular(this.prisma, {
        from: monthStart,
        to: tomorrow,
        tz,
        limit: 5,
      }),
      this.prisma.$queryRaw<{ id: string; name: string; books: bigint }[]>`
        SELECT s.id, s.name, count(*) AS books
        FROM "Subject" s JOIN "BookSubject" bs ON bs."subjectId" = s.id
        JOIN "Book" b ON b.id = bs."bookId" AND b."deletedAt" IS NULL
        GROUP BY s.id ORDER BY books DESC, s.name LIMIT 12`,
      this.policies.list(),
      this.settings.get(),
    ]);

    const popularBooks = await this.prisma.book.findMany({
      where: { id: { in: popular.rows.map((r) => r.id as string) } },
      select: {
        id: true,
        coverKey: true,
        authors: {
          select: { author: { select: { name: true } } },
          orderBy: { position: 'asc' },
        },
      },
    });
    const extra = new Map(popularBooks.map((b) => [b.id, b]));
    return {
      library: {
        institutionName: library.institutionName,
        openingHours: library.openingHours,
        address: library.address,
      },
      stats: { titles, items, available, activeMembers: members },
      newest: await this.books.presentMany(newest),
      popularThisMonth: popular.rows.map((r) => {
        const b = extra.get(r.id as string);
        return {
          ...r,
          cover: this.books.cover(b?.coverKey ?? null),
          authors: b?.authors.map((a) => a.author.name) ?? [],
        };
      }),
      subjects: subjects.map((s) => ({ ...s, books: Number(s.books) })),
      loanRules: policies.map((p) => ({
        memberType: p.memberType,
        maxActiveLoans: p.maxActiveLoans,
        loanDays: p.loanDays,
        maxRenewals: p.maxRenewals,
        finePerDay: p.finePerDay,
      })),
    };
  }
}
