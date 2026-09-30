// id-ID formatting for data shown in IBM Plex Mono (PRD NFR i18n, DESIGN.md typography).
const TZ = "Asia/Jakarta";

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
const rupiahFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const numberFmt = new Intl.NumberFormat("id-ID");

/** "12 Okt 2026" */
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
/** "Rp5.000" (no space, per DESIGN.md) */
export const formatRupiah = (amount: number) => rupiahFmt.format(amount).replace(/\s/g, "");
/** "12.480" */
export const formatNumber = (n: number) => numberFmt.format(n);

/** Whole days from today (Jakarta) to the given date; negative when past. */
export function daysUntil(iso: string, now = new Date()): number {
  const day = (d: Date) => Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d));
  return Math.round((day(new Date(iso)) - day(now)) / 86_400_000);
}
