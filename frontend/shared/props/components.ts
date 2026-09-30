// Props for the design-system components (docs/design/DESIGN.md, docs/design/README.md).
// Components live in components/editorial/* and components/ui/*; they import these.

import type { ReactNode } from "react";
import type { ClassNameProps } from "./common";
import type { Author, Availability, Item, Loan } from "../types/models";
import type { FineStatus, HoldStatus, ItemStatus, MemberStatus } from "../types/enums";

// ── Signature components ─────────────────────────────────────────────────────

export interface CallNumberProps extends ClassNameProps {
  value: string;
}

export type DueState = "normal" | "soon" | "overdue";

export interface DueSlipProps extends ClassNameProps {
  loan: Loan;
  /** Derived from dueAt when omitted: soon = ≤2 days, overdue = past. */
  state?: DueState;
  onRenew?: (loanId: string) => void;
  renewDisabledReason?: string | null;
  isRenewing?: boolean;
}

export interface IndexCardField {
  label: string;
  value: ReactNode;
}

export interface IndexCardProps extends ClassNameProps {
  callNumber: string;
  /** Book title is the page headline here → Anton (owner decision). */
  title: string;
  authors: Author[];
  year: number | null;
  availability: Availability;
  fields: IndexCardField[];
  subjects?: string[];
  synopsis?: string | null;
  items?: Item[];
  actions?: ReactNode;
}

export interface BookCoverProps extends ClassNameProps {
  title: string;
  author?: string;
  coverUrl: string | null;
  /** Rendered width in px; height follows the 2:3 ratio. */
  width?: number;
  priority?: boolean;
}

// ── Standard components ──────────────────────────────────────────────────────

export type StatusBadgeValue = ItemStatus | HoldStatus | FineStatus | MemberStatus | "OVERDUE";

export interface StatusBadgeProps extends ClassNameProps {
  status: StatusBadgeValue;
  /** Overrides the default Indonesian label, e.g. "Terlambat 8 hari". */
  label?: string;
}

export interface PageHeadingProps extends ClassNameProps {
  kicker: string;
  title: string;
  actions?: ReactNode;
}

export interface EmptyStateProps extends ClassNameProps {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export type ScanCodeType = "ITEM" | "MEMBER" | "ISBN" | "UNKNOWN";

export interface ScanInputProps extends ClassNameProps {
  placeholder: string;
  onScan: (code: string, type: ScanCodeType) => void;
  /** Flash the oxblood error border (e.g. after a rejected scan). */
  hasError?: boolean;
  disabled?: boolean;
  statusLine?: ReactNode;
}

export interface KbdProps extends ClassNameProps {
  keys: string[];
}

export interface StatProps extends ClassNameProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "accent";
}

export interface PaginationProps extends ClassNameProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
