import {
  evaluateCheckout,
  type ItemSnapshot,
  itemReasons,
  renewReasons,
} from './circulation.rules.js';

const now = new Date('2026-05-10T03:00:00Z');
const member = {
  id: 'm1',
  status: 'ACTIVE' as const,
  validUntil: new Date('2027-01-01'),
};
const policy = {
  maxActiveLoans: 3,
  maxRenewals: 1,
  blockingFineThreshold: 10_000,
};
const item = (over: Partial<ItemSnapshot> = {}): ItemSnapshot => ({
  barcode: 'PST-2026-000001',
  status: 'AVAILABLE',
  deleted: false,
  heldForMemberId: null,
  ...over,
});
const codes = (r: { code: string }[]) => r.map((x) => x.code);

describe('evaluateCheckout', () => {
  const base = {
    member,
    policy,
    activeLoans: 0,
    unpaidFines: 0,
    now,
    items: [{ barcode: 'A', item: item() }],
  };

  it('lolos untuk anggota aktif & eksemplar tersedia', () => {
    expect(evaluateCheckout(base).ok).toBe(true);
  });

  it('menolak anggota suspended/expired', () => {
    expect(
      codes(
        evaluateCheckout({
          ...base,
          member: { ...member, status: 'SUSPENDED' },
        }).member,
      ),
    ).toContain('MEMBER_SUSPENDED');
    const expired = evaluateCheckout({
      ...base,
      member: { ...member, validUntil: new Date('2026-01-01') },
    });
    expect(codes(expired.member)).toContain('MEMBER_EXPIRED');
  });

  it('menolak bila melewati kuota termasuk batch saat ini', () => {
    const r = evaluateCheckout({
      ...base,
      activeLoans: 2,
      items: [
        { barcode: 'A', item: item() },
        { barcode: 'B', item: item({ barcode: 'B' }) },
      ],
    });
    expect(r.ok).toBe(false);
    expect(codes(r.member)).toContain('LOAN_LIMIT');
  });

  it('menolak bila denda >= batas blokir', () => {
    expect(
      codes(evaluateCheckout({ ...base, unpaidFines: 10_000 }).member),
    ).toContain('FINE_LIMIT');
    expect(evaluateCheckout({ ...base, unpaidFines: 9_999 }).ok).toBe(true);
  });

  it('scan ganda ditandai', () => {
    const r = evaluateCheckout({
      ...base,
      items: [
        { barcode: 'A', item: item() },
        { barcode: 'A', item: item() },
      ],
    });
    expect(codes(r.items[1].reasons)).toContain('DUPLICATE_SCAN');
  });
});

describe('itemReasons', () => {
  it('ON_HOLD hanya untuk anggota pemilik reservasi', () => {
    expect(
      itemReasons(item({ status: 'ON_HOLD', heldForMemberId: 'm1' }), 'm1'),
    ).toEqual([]);
    expect(
      codes(
        itemReasons(item({ status: 'ON_HOLD', heldForMemberId: 'm2' }), 'm1'),
      ),
    ).toEqual(['ITEM_ON_HOLD']);
  });

  it('status lain ditolak', () => {
    expect(codes(itemReasons(item({ status: 'ON_LOAN' }), 'm1'))).toEqual([
      'ITEM_ON_LOAN',
    ]);
    expect(codes(itemReasons(item({ status: 'IN_REPAIR' }), 'm1'))).toEqual([
      'ITEM_UNAVAILABLE',
    ]);
    expect(codes(itemReasons(null, 'm1'))).toEqual(['ITEM_NOT_FOUND']);
    expect(codes(itemReasons(item({ deleted: true }), 'm1'))).toEqual([
      'ITEM_NOT_FOUND',
    ]);
  });
});

describe('renewReasons', () => {
  const base = {
    member,
    policy,
    unpaidFines: 0,
    dueAt: new Date('2026-05-12T16:59:59Z'),
    renewCount: 0,
    waitingHolds: 0,
    now,
  };

  it('boleh perpanjang', () => {
    expect(renewReasons(base)).toEqual([]);
  });

  it('ditolak bila overdue, limit, atau ada antrean', () => {
    expect(
      codes(renewReasons({ ...base, dueAt: new Date('2026-05-09') })),
    ).toContain('LOAN_OVERDUE');
    expect(codes(renewReasons({ ...base, renewCount: 1 }))).toContain(
      'RENEW_LIMIT',
    );
    expect(codes(renewReasons({ ...base, waitingHolds: 2 }))).toContain(
      'HAS_HOLDS',
    );
  });
});
