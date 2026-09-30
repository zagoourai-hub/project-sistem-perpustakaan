import { type LocalDate, lateDays } from '../../common/utils/date.util.js';

export interface OverdueFineInput {
  dueAt: Date;
  at: Date;
  finePerDay: number;
  maxFinePerLoan: number;
  holidays: ReadonlySet<LocalDate>;
  tz: string;
}

/** Denda keterlambatan: hari telat (tanpa hari libur) × tarif, dibatasi maksimum per pinjaman. */
export function overdueFine(i: OverdueFineInput) {
  const days = lateDays(i.dueAt, i.at, i.holidays, i.tz);
  return { days, amount: Math.min(days * i.finePerDay, i.maxFinePerLoan) };
}

/** Sisa tagihan satu denda. */
export const outstanding = (f: {
  amount: number;
  paidAmount: number;
  status: string;
}) => (f.status === 'UNPAID' ? Math.max(0, f.amount - f.paidAmount) : 0);
