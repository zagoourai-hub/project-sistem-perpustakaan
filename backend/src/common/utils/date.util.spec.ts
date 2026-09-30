import {
  computeDueAt,
  endOfLocalDay,
  lateDays,
  nextOpenDay,
  toLocalDate,
} from './date.util.js';

const TZ = 'Asia/Jakarta';

describe('date.util', () => {
  it('toLocalDate memakai timezone lokal', () => {
    // 20:00 UTC = 03:00 WIB hari berikutnya
    expect(toLocalDate(new Date('2026-01-01T20:00:00Z'), TZ)).toBe(
      '2026-01-02',
    );
  });

  it('endOfLocalDay = 23:59:59.999 WIB', () => {
    expect(endOfLocalDay('2026-01-10', TZ).toISOString()).toBe(
      '2026-01-10T16:59:59.999Z',
    );
  });

  it('jatuh tempo digeser melewati hari libur berurutan', () => {
    const holidays = new Set(['2026-01-08', '2026-01-09']);
    expect(nextOpenDay('2026-01-08', holidays)).toBe('2026-01-10');
    const due = computeDueAt(new Date('2026-01-01T03:00:00Z'), 7, holidays, TZ);
    expect(toLocalDate(due, TZ)).toBe('2026-01-10');
  });

  it('lateDays tidak menghitung hari libur dan 0 bila tepat waktu', () => {
    const due = endOfLocalDay('2026-01-10', TZ);
    expect(lateDays(due, new Date('2026-01-10T10:00:00Z'), new Set(), TZ)).toBe(
      0,
    );
    expect(lateDays(due, new Date('2026-01-13T02:00:00Z'), new Set(), TZ)).toBe(
      3,
    );
    expect(
      lateDays(
        due,
        new Date('2026-01-13T02:00:00Z'),
        new Set(['2026-01-12']),
        TZ,
      ),
    ).toBe(2);
  });
});
