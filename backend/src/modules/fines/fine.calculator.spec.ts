import { endOfLocalDay } from '../../common/utils/date.util.js';
import { outstanding, overdueFine } from './fine.calculator.js';

const base = {
  dueAt: endOfLocalDay('2026-03-02', 'Asia/Jakarta'),
  finePerDay: 500,
  maxFinePerLoan: 2000,
  holidays: new Set<string>(),
  tz: 'Asia/Jakarta',
};

describe('overdueFine', () => {
  it('0 bila dikembalikan tepat di hari jatuh tempo', () => {
    expect(
      overdueFine({ ...base, at: new Date('2026-03-02T15:00:00Z') }),
    ).toEqual({ days: 0, amount: 0 });
  });

  it('hari telat × tarif', () => {
    // 5 Maret 09:00 WIB → telat 3 hari
    expect(
      overdueFine({ ...base, at: new Date('2026-03-05T02:00:00Z') }),
    ).toEqual({ days: 3, amount: 1500 });
  });

  it('hari libur tidak dihitung', () => {
    const r = overdueFine({
      ...base,
      holidays: new Set(['2026-03-03']),
      at: new Date('2026-03-05T02:00:00Z'),
    });
    expect(r).toEqual({ days: 2, amount: 1000 });
  });

  it('dibatasi maxFinePerLoan', () => {
    expect(
      overdueFine({ ...base, at: new Date('2026-04-01T02:00:00Z') }).amount,
    ).toBe(2000);
  });
});

describe('outstanding', () => {
  it('sisa hanya untuk UNPAID', () => {
    expect(
      outstanding({ amount: 1500, paidAmount: 500, status: 'UNPAID' }),
    ).toBe(1000);
    expect(outstanding({ amount: 1500, paidAmount: 0, status: 'WAIVED' })).toBe(
      0,
    );
  });
});
