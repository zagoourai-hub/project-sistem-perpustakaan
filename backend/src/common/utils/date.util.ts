/**
 * Utilitas tanggal berbasis "tanggal lokal" (YYYY-MM-DD) di timezone perpustakaan.
 * Jatuh tempo = akhir hari lokal; hari libur tidak dihitung dan menggeser jatuh tempo.
 */

export type LocalDate = string; // 'YYYY-MM-DD'

export function toLocalDate(d: Date, tz: string): LocalDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
}

/** Kolom @db.Date dari Prisma (UTC midnight) → LocalDate. */
export const dbDate = (d: Date): LocalDate => d.toISOString().slice(0, 10);

export function addDays(date: LocalDate, n: number): LocalDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function tzOffset(date: LocalDate, tz: string): string {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((p) => p.type === 'timeZoneName')!.value; // "GMT+07:00" atau "GMT"
  return name === 'GMT' ? 'Z' : name.slice(3);
}

export function endOfLocalDay(date: LocalDate, tz: string): Date {
  return new Date(`${date}T23:59:59.999${tzOffset(date, tz)}`);
}

export function startOfLocalDay(date: LocalDate, tz: string): Date {
  return new Date(`${date}T00:00:00.000${tzOffset(date, tz)}`);
}

/** Geser ke hari buka berikutnya bila jatuh di hari libur. */
export function nextOpenDay(
  date: LocalDate,
  holidays: ReadonlySet<LocalDate>,
): LocalDate {
  let d = date;
  // ponytail: batas 366 iterasi melindungi dari data libur setahun penuh
  for (let i = 0; holidays.has(d) && i < 366; i++) d = addDays(d, 1);
  return d;
}

export function computeDueAt(
  from: Date,
  loanDays: number,
  holidays: ReadonlySet<LocalDate>,
  tz: string,
): Date {
  return endOfLocalDay(
    nextOpenDay(addDays(toLocalDate(from, tz), loanDays), holidays),
    tz,
  );
}

/** Jumlah hari terlambat (hari libur tidak dihitung). 0 bila belum lewat jatuh tempo. */
export function lateDays(
  dueAt: Date,
  at: Date,
  holidays: ReadonlySet<LocalDate>,
  tz: string,
): number {
  if (at <= dueAt) return 0;
  const end = toLocalDate(at, tz);
  let count = 0;
  for (
    let d = addDays(toLocalDate(dueAt, tz), 1);
    d <= end;
    d = addDays(d, 1)
  ) {
    if (!holidays.has(d)) count++;
  }
  return count;
}
