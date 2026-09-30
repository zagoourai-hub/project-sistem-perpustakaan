import type { ItemStatus } from '../../generated/prisma/enums.js';

/** Semua transisi status eksemplar yang valid (FR-B4). */
export const TRANSITIONS: Record<ItemStatus, readonly ItemStatus[]> = {
  AVAILABLE: [
    'ON_LOAN',
    'ON_HOLD',
    'IN_REPAIR',
    'DAMAGED',
    'LOST',
    'WITHDRAWN',
  ],
  ON_LOAN: ['AVAILABLE', 'ON_HOLD', 'LOST', 'DAMAGED'],
  ON_HOLD: ['ON_LOAN', 'AVAILABLE', 'ON_HOLD'],
  LOST: ['AVAILABLE', 'WITHDRAWN'],
  DAMAGED: ['IN_REPAIR', 'AVAILABLE', 'WITHDRAWN'],
  IN_REPAIR: ['AVAILABLE', 'WITHDRAWN'],
  WITHDRAWN: [],
};

/**
 * Transisi yang boleh dilakukan staf lewat edit eksemplar.
 * ON_LOAN/ON_HOLD hanya lewat sirkulasi & reservasi.
 */
const MANUAL_TARGETS: ReadonlySet<ItemStatus> = new Set([
  'AVAILABLE',
  'IN_REPAIR',
  'DAMAGED',
  'LOST',
  'WITHDRAWN',
]);

export function canTransition(from: ItemStatus, to: ItemStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function canTransitionManually(
  from: ItemStatus,
  to: ItemStatus,
): boolean {
  return (
    from !== 'ON_LOAN' &&
    from !== 'ON_HOLD' &&
    MANUAL_TARGETS.has(to) &&
    canTransition(from, to)
  );
}
