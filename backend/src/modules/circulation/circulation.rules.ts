/**
 * Aturan sirkulasi sebagai fungsi murni: input = snapshot data, output = daftar alasan tolak.
 * Daftar kosong = boleh. Service yang mengumpulkan data & menjalankan transaksi.
 */
import type { ItemStatus, MemberStatus } from '../../generated/prisma/enums.js';

export interface Reason {
  code: string;
  message: string;
}

export interface MemberSnapshot {
  id: string;
  status: MemberStatus;
  validUntil: Date;
}

export interface PolicySnapshot {
  maxActiveLoans: number;
  maxRenewals: number;
  blockingFineThreshold: number;
}

export interface ItemSnapshot {
  barcode: string;
  status: ItemStatus;
  deleted: boolean;
  /** memberId pemilik hold READY atas eksemplar ini (bila ON_HOLD). */
  heldForMemberId: string | null;
}

const reason = (code: string, message: string): Reason => ({ code, message });

export function memberReasons(
  member: MemberSnapshot,
  unpaidFines: number,
  policy: PolicySnapshot,
  now: Date,
): Reason[] {
  const out: Reason[] = [];
  if (member.status === 'SUSPENDED')
    out.push(reason('MEMBER_SUSPENDED', 'Keanggotaan ditangguhkan'));
  if (member.status === 'EXPIRED' || member.validUntil < now) {
    out.push(reason('MEMBER_EXPIRED', 'Masa berlaku keanggotaan habis'));
  }
  if (
    policy.blockingFineThreshold > 0 &&
    unpaidFines >= policy.blockingFineThreshold
  ) {
    out.push(reason('FINE_LIMIT', 'Denda belum lunas melewati batas'));
  }
  return out;
}

export function itemReasons(
  item: ItemSnapshot | null,
  memberId: string,
): Reason[] {
  if (!item || item.deleted)
    return [reason('ITEM_NOT_FOUND', 'Barcode tidak dikenal')];
  if (item.status === 'AVAILABLE') return [];
  if (item.status === 'ON_HOLD') {
    return item.heldForMemberId === memberId
      ? []
      : [
          reason(
            'ITEM_ON_HOLD',
            'Eksemplar disimpan untuk reservasi anggota lain',
          ),
        ];
  }
  if (item.status === 'ON_LOAN')
    return [reason('ITEM_ON_LOAN', 'Eksemplar sedang dipinjam')];
  return [reason('ITEM_UNAVAILABLE', `Eksemplar berstatus ${item.status}`)];
}

export interface CheckoutEvaluation {
  ok: boolean;
  member: Reason[];
  items: { barcode: string; reasons: Reason[] }[];
}

/** FR-E1: anggota aktif, kuota, batas denda, dan status tiap eksemplar. */
export function evaluateCheckout(input: {
  member: MemberSnapshot;
  policy: PolicySnapshot;
  activeLoans: number;
  unpaidFines: number;
  items: { barcode: string; item: ItemSnapshot | null }[];
  now: Date;
}): CheckoutEvaluation {
  const member = memberReasons(
    input.member,
    input.unpaidFines,
    input.policy,
    input.now,
  );
  if (input.activeLoans + input.items.length > input.policy.maxActiveLoans) {
    const left = Math.max(0, input.policy.maxActiveLoans - input.activeLoans);
    member.push(
      reason(
        'LOAN_LIMIT',
        `Kuota pinjam tersisa ${left} dari ${input.policy.maxActiveLoans}`,
      ),
    );
  }
  const seen = new Set<string>();
  const items = input.items.map(({ barcode, item }) => {
    const reasons = itemReasons(item, input.member.id);
    if (seen.has(barcode))
      reasons.push(reason('DUPLICATE_SCAN', 'Barcode discan dua kali'));
    seen.add(barcode);
    return { barcode, reasons };
  });
  return {
    ok: member.length === 0 && items.every((i) => i.reasons.length === 0),
    member,
    items,
  };
}

/** FR-E3: tolak bila overdue, mencapai maks perpanjangan, atau judul punya antrean. */
export function renewReasons(input: {
  member: MemberSnapshot;
  policy: PolicySnapshot;
  unpaidFines: number;
  dueAt: Date;
  renewCount: number;
  waitingHolds: number;
  now: Date;
}): Reason[] {
  const out = memberReasons(
    input.member,
    input.unpaidFines,
    input.policy,
    input.now,
  );
  if (input.dueAt < input.now)
    out.push(reason('LOAN_OVERDUE', 'Pinjaman sudah lewat jatuh tempo'));
  if (input.renewCount >= input.policy.maxRenewals) {
    out.push(
      reason(
        'RENEW_LIMIT',
        `Sudah diperpanjang ${input.renewCount}× (maks ${input.policy.maxRenewals})`,
      ),
    );
  }
  if (input.waitingHolds > 0)
    out.push(reason('HAS_HOLDS', 'Judul ini sedang dalam antrean reservasi'));
  return out;
}
