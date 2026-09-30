import { create } from "zustand";
import type { CheckinResult, CheckoutResult, ItemWithBook } from "@/shared/types/models";

// Desk-local UI state (PRD FE-6.4.1). Server data (member summary, loans) stays in
// TanStack Query; this only holds what the librarian has scanned so far.

export type QueueRow =
  | { barcode: string; state: "checking" }
  | { barcode: string; state: "ok"; item: ItemWithBook; dueAt: string }
  | { barcode: string; state: "rejected"; item?: ItemWithBook; reasons: string[] };

export type ReturnRow =
  | { id: string; barcode: string; state: "checking" }
  | { id: string; barcode: string; state: "done"; result: CheckinResult }
  | { id: string; barcode: string; state: "error"; message: string };

interface CirculationState {
  memberCode: string | null;
  queue: QueueRow[];
  /** Last successful checkout, shown until the next transaction starts. */
  lastCheckout: CheckoutResult | null;
  returns: ReturnRow[];

  setMember: (code: string) => void;
  upsertRow: (row: QueueRow) => void;
  removeRow: (barcode: string) => void;
  finishCheckout: (result: CheckoutResult) => void;
  reset: () => void;
  upsertReturn: (row: ReturnRow) => void;
}

export const useCirculationStore = create<CirculationState>()((set) => ({
  memberCode: null,
  queue: [],
  lastCheckout: null,
  returns: [],

  // A different card starts a new transaction; re-scanning the same card keeps the queue.
  setMember: (code) =>
    set((s) => (s.memberCode === code ? s : { memberCode: code, queue: [], lastCheckout: null })),
  upsertRow: (row) =>
    set((s) => {
      const i = s.queue.findIndex((r) => r.barcode === row.barcode);
      const queue = i === -1 ? [...s.queue, row] : s.queue.map((r, j) => (j === i ? row : r));
      return { queue, lastCheckout: null };
    }),
  removeRow: (barcode) => set((s) => ({ queue: s.queue.filter((r) => r.barcode !== barcode) })),
  // Keep backend rejections visible; accepted rows leave the queue.
  finishCheckout: (result) =>
    set((s) => ({
      lastCheckout: result,
      queue: result.rejected.map((r) => {
        const prev = s.queue.find((q) => q.barcode === r.barcode);
        return { barcode: r.barcode, state: "rejected" as const, item: prev && "item" in prev ? prev.item : undefined, reasons: r.reasons };
      }),
    })),
  reset: () => set({ memberCode: null, queue: [], lastCheckout: null }),
  // Newest return first; the list is capped so a long shift doesn't grow unbounded.
  upsertReturn: (row) =>
    set((s) => {
      const exists = s.returns.some((r) => r.id === row.id);
      const returns = exists ? s.returns.map((r) => (r.id === row.id ? row : r)) : [row, ...s.returns];
      return { returns: returns.slice(0, 50) };
    }),
}));
