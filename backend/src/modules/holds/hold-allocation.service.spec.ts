import { HoldAllocationService } from './hold-allocation.service.js';

type Status = 'AVAILABLE' | 'ON_HOLD' | 'ON_LOAN';

/** Transaksi palsu dengan semantik update bersyarat (count 0 bila status tidak cocok). */
function fakeTx(
  itemStatus: Status,
  holds: { id: string; memberId: string; status: string }[],
) {
  const item = {
    bookId: 'b1',
    status: itemStatus as Status,
    deletedAt: null,
    book: { title: 'Judul' },
  };
  return {
    item,
    holds,
    tx: {
      item: {
        findUnique: vi.fn(async () => item),
        updateMany: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { status: Status };
            data: { status: Status };
          }) => {
            if (item.status !== where.status) return { count: 0 };
            item.status = data.status;
            return { count: 1 };
          },
        ),
      },
      hold: {
        findFirst: vi.fn(async () => {
          const h = holds.find((x) => x.status === 'WAITING');
          return h ? { ...h, member: { type: 'STUDENT' } } : null;
        }),
        updateMany: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string; status: string };
            data: { status: string };
          }) => {
            const h = holds.find(
              (x) => x.id === where.id && x.status === where.status,
            );
            if (!h) return { count: 0 };
            h.status = data.status;
            return { count: 1 };
          },
        ),
      },
    },
  };
}

const service = new HoldAllocationService(
  {} as never,
  { get: async () => ({ holdPickupDays: 3 }) } as never,
  { timezone: async () => 'Asia/Jakarta' } as never,
  { notify: vi.fn() } as never,
);

describe('HoldAllocationService.allocateInTx', () => {
  it('antrean teratas mendapat READY, eksemplar ON_HOLD', async () => {
    const f = fakeTx('AVAILABLE', [
      { id: 'h1', memberId: 'm1', status: 'WAITING' },
      { id: 'h2', memberId: 'm2', status: 'WAITING' },
    ]);
    const a = await service.allocateInTx(f.tx as never, 'i1');
    expect(a).toMatchObject({
      holdId: 'h1',
      memberId: 'm1',
      bookTitle: 'Judul',
    });
    expect(a!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 2 * 86_400_000);
    expect(f.item.status).toBe('ON_HOLD');
    expect(f.holds.map((h) => h.status)).toEqual(['READY', 'WAITING']);
  });

  it('tanpa antrean: eksemplar tetap AVAILABLE', async () => {
    const f = fakeTx('AVAILABLE', []);
    expect(await service.allocateInTx(f.tx as never, 'i1')).toBeNull();
    expect(f.item.status).toBe('AVAILABLE');
  });

  it('eksemplar tidak AVAILABLE tidak dialokasikan', async () => {
    const f = fakeTx('ON_LOAN', [
      { id: 'h1', memberId: 'm1', status: 'WAITING' },
    ]);
    expect(await service.allocateInTx(f.tx as never, 'i1')).toBeNull();
    expect(f.holds[0].status).toBe('WAITING');
  });

  it('releaseInTx: ON_HOLD → AVAILABLE → antrean berikutnya', async () => {
    const f = fakeTx('ON_HOLD', [
      { id: 'h2', memberId: 'm2', status: 'WAITING' },
    ]);
    const a = await service.releaseInTx(f.tx as never, 'i1');
    expect(a?.memberId).toBe('m2');
    expect(f.item.status).toBe('ON_HOLD');
  });
});
