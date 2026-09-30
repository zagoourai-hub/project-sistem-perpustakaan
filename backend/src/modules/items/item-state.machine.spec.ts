import { canTransition, canTransitionManually } from './item-state.machine.js';

describe('item state machine', () => {
  it('sirkulasi normal', () => {
    expect(canTransition('AVAILABLE', 'ON_LOAN')).toBe(true);
    expect(canTransition('ON_LOAN', 'AVAILABLE')).toBe(true);
    expect(canTransition('ON_LOAN', 'ON_HOLD')).toBe(true);
    expect(canTransition('ON_HOLD', 'ON_LOAN')).toBe(true);
  });

  it('WITHDRAWN final', () => {
    expect(canTransition('WITHDRAWN', 'AVAILABLE')).toBe(false);
  });

  it('staf tidak bisa mengubah eksemplar yang sedang dipinjam/disimpan', () => {
    expect(canTransitionManually('ON_LOAN', 'AVAILABLE')).toBe(false);
    expect(canTransitionManually('ON_HOLD', 'AVAILABLE')).toBe(false);
    expect(canTransitionManually('AVAILABLE', 'ON_LOAN')).toBe(false);
  });

  it('perbaikan & penarikan manual', () => {
    expect(canTransitionManually('AVAILABLE', 'IN_REPAIR')).toBe(true);
    expect(canTransitionManually('IN_REPAIR', 'AVAILABLE')).toBe(true);
    expect(canTransitionManually('LOST', 'AVAILABLE')).toBe(true);
    expect(canTransitionManually('IN_REPAIR', 'LOST')).toBe(false);
  });
});
