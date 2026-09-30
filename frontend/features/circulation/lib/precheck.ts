// Desk-side preview of the checkout rules (FR-E1) so each scanned row shows
// "Siap dipinjam" or a rejection before confirming. The backend re-validates
// everything on POST /circulation/checkout — this is UX, not enforcement.
// Relative imports keep it runnable by circulation.check.ts under plain Node.
import type { ItemWithBook, MemberSummary } from "../../../shared/types/models.ts";

export type Precheck = { ok: true; dueAt: string } | { ok: false; reasons: string[] };

const JAKARTA = "Asia/Jakarta";

/** Today (Jakarta) + loanDays as YYYY-MM-DD. Holidays are shifted by the backend. */
export function previewDueDate(loanDays: number, now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: JAKARTA }).format(now);
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + loanDays);
  return d.toISOString().slice(0, 10);
}

/** Member-level blockers, shown in the member panel before any item is scanned. */
export function memberBlockers(member: MemberSummary, now = new Date()): string[] {
  const reasons: string[] = [];
  if (member.status === "SUSPENDED") reasons.push("Keanggotaan ditangguhkan");
  if (member.status === "EXPIRED" || new Date(member.validUntil) < now) reasons.push("Keanggotaan sudah tidak berlaku");
  if (member.unpaidFines >= member.blockingFineThreshold) reasons.push("Denda melewati batas blokir");
  return reasons;
}

export function precheckItem(
  member: MemberSummary,
  item: ItemWithBook,
  /** Barcodes already accepted in the scan queue (excluding this one). */
  queued: string[],
  now = new Date(),
): Precheck {
  const reasons = memberBlockers(member, now);

  if (queued.includes(item.barcode)) reasons.push("Sudah ada di antrean");
  const heldForThisMember = item.status === "ON_HOLD" && item.heldForMemberId === member.id;
  if (item.status !== "AVAILABLE" && !heldForThisMember) {
    reasons.push(
      item.status === "ON_HOLD"
        ? "Disimpan untuk reservasi anggota lain"
        : item.status === "ON_LOAN"
          ? "Eksemplar sedang dipinjam"
          : "Eksemplar tidak dapat dipinjam",
    );
  }
  const used = member.activeLoans + queued.length;
  if (used >= member.maxActiveLoans) {
    reasons.push(`Kuota pinjam penuh (${used}/${member.maxActiveLoans})`);
  }

  return reasons.length ? { ok: false, reasons } : { ok: true, dueAt: previewDueDate(member.loanDays, now) };
}
