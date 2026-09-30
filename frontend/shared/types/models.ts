// Response shapes returned by the backend (PRD §9.3 data model, §9.4 API surface).
// Money is integer Rupiah. Dates are ISO strings (format with lib/format).

import type { IsoDate } from "./api";
import type {
  FineStatus,
  FineType,
  HoldStatus,
  ItemCondition,
  ItemSource,
  ItemStatus,
  MemberStatus,
  MemberType,
  NotificationType,
  Role,
} from "./enums";

// ── Auth & people ────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  /** Present when role is MEMBER. */
  memberId: string | null;
}

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: Exclude<Role, "MEMBER">;
  isActive: boolean;
  lastLoginAt: IsoDate | null;
  createdAt: IsoDate;
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  memberCode: string;
  idNumber: string;
  type: MemberType;
  classOrMajor: string | null;
  phone: string | null;
  photoUrl: string | null;
  status: MemberStatus;
  validUntil: IsoDate;
  emailReminders: boolean;
}

/** Member panel at the circulation desk (lookup by scanned card). */
export interface MemberSummary extends Member {
  activeLoans: number;
  maxActiveLoans: number;
  readyHolds: number;
  unpaidFines: number;
  blockingFineThreshold: number;
  /** From the member type's LoanPolicy, for the due-date preview at the desk. */
  loanDays: number;
  overdueLoans?: number;
  activeHolds?: number;
}

/** POST /members and POST /members/:id/reset-password: the temporary password is shown once. */
export type MemberWithPassword = Member & { temporaryPassword: string };

export interface MemberImportResult {
  total: number;
  /** Rows that pass validation (dry run) or were created. */
  valid: number;
  created: number;
  failed: { row: number; idNumber?: string; errors: string[] }[];
  /** Created accounts with their temporary passwords (empty on a dry run). */
  accounts: MemberWithPassword[];
}

// ── Catalog ──────────────────────────────────────────────────────────────────

export interface Author {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Publisher {
  id: string;
  name: string;
}

export interface ShelfLocation {
  id: string;
  code: string;
  name: string;
}

export interface Availability {
  total: number;
  available: number;
  /** Shelf codes where available copies sit, e.g. ["B-04"]. */
  shelves: string[];
  holdQueue: number;
}

export interface BookSummary {
  id: string;
  title: string;
  subtitle: string | null;
  authors: Author[];
  year: number | null;
  callNumber: string;
  coverUrl: string | null;
  availability: Availability;
}

export interface Book extends BookSummary {
  isbn13: string | null;
  isbn10: string | null;
  publisher: Publisher | null;
  language: string;
  pages: number | null;
  ddc: string | null;
  synopsis: string | null;
  subjects: Subject[];
  items: Item[];
}

/** Prefill returned by ISBN lookup (Open Library). Never saved automatically. */
export interface BookDraft {
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  year: number | null;
  isbn13: string | null;
  isbn10: string | null;
  language: string | null;
  pages: number | null;
  synopsis: string | null;
  coverUrl: string | null;
  /** false when Open Library had nothing; the draft then only echoes the ISBN. */
  found?: boolean;
  /** Set when the ISBN is already in the catalog. */
  existingBookId?: string | null;
}

export interface Item {
  id: string;
  bookId: string;
  barcode: string;
  shelfLocation: ShelfLocation;
  status: ItemStatus;
  condition: ItemCondition | null;
  source: ItemSource;
  price: number | null;
  acquiredAt: IsoDate;
  /** Due date of the active loan when status is ON_LOAN. */
  dueAt: IsoDate | null;
  /** Member the copy is reserved for when status is ON_HOLD (FR-E1). */
  heldForMemberId: string | null;
}

/** Item lookup by scanned barcode, with its book for display. */
export interface ItemWithBook extends Item {
  book: BookSummary;
}

// ── Circulation ──────────────────────────────────────────────────────────────

export interface Loan {
  id: string;
  item: ItemWithBook;
  memberId: string;
  checkedOutAt: IsoDate;
  dueAt: IsoDate;
  returnedAt: IsoDate | null;
  renewCount: number;
  maxRenewals: number;
  /** Running overdue fine (updated daily by the backend job). */
  accruedFine: number;
}

export interface CheckoutRejection {
  barcode: string;
  reasons: string[];
}

export interface CheckoutResult {
  loans: Loan[];
  rejected: CheckoutRejection[];
}

export interface CheckinResult {
  loan: Loan;
  member: Pick<Member, "id" | "name" | "classOrMajor">;
  fine: Fine | null;
  /** Set when the returned copy was allocated to the next hold in queue. */
  heldFor: Pick<Hold, "id" | "expiresAt"> & { memberName: string; classOrMajor: string } | null;
  returnToShelf: string | null;
}

export interface Fine {
  id: string;
  loanId: string;
  type: FineType;
  amount: number;
  paidAmount: number;
  status: FineStatus;
  waivedReason: string | null;
  /** amount − paidAmount, computed by the backend. */
  outstanding: number;
  payments: Pick<FinePayment, "id" | "amount" | "paidAt">[];
  member: Pick<Member, "id" | "name" | "classOrMajor"> & { memberCode: string };
  book: Pick<BookSummary, "id" | "title">;
  createdAt: IsoDate;
}

export interface FinePayment {
  id: string;
  fineId: string;
  amount: number;
  receivedBy: string;
  paidAt: IsoDate;
}

export interface Hold {
  id: string;
  book: BookSummary;
  memberId: string;
  status: HoldStatus;
  queuedAt: IsoDate;
  readyAt: IsoDate | null;
  expiresAt: IsoDate | null;
  /** 1-based position while WAITING. */
  queuePosition: number | null;
  /** Staff list only. */
  member?: Pick<Member, "id" | "name" | "classOrMajor"> & { memberCode: string };
  /** Copy set aside once READY (staff list only). */
  item?: { id: string; barcode: string } | null;
}

// ── Portal, search, notifications ────────────────────────────────────────────

export interface SearchResult extends BookSummary {
  publisher?: Publisher | null;
  synopsis: string | null;
  /** True when the hit came from (or was boosted by) semantic search. */
  semantic: boolean;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tookMs: number;
  /** False when the AI service timed out and results are full-text only. */
  semanticAvailable: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: IsoDate | null;
  createdAt: IsoDate;
}

// ── Admin & reports ──────────────────────────────────────────────────────────

export interface LoanPolicy {
  memberType: MemberType;
  maxActiveLoans: number;
  loanDays: number;
  maxRenewals: number;
  finePerDay: number;
  maxFinePerLoan: number;
  blockingFineThreshold: number;
  holdPickupDays: number;
  maxActiveHolds: number;
}

export interface Holiday {
  id: string;
  date: IsoDate;
  name: string;
}

export interface LibrarySettings {
  institutionName: string;
  logoUrl: string | null;
  address: string;
  openingHours: string;
  senderEmail: string;
  timezone: string;
}

export interface AuditLog {
  id: string;
  actor: { id: string; name: string } | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: IsoDate;
}

export interface DashboardKpis {
  loansToday: number;
  returnsToday: number;
  overdueActive: number;
  holdsReady: number;
  unpaidFinesTotal: number;
  unpaidFinesToday: number;
  /** vs yesterday */
  deltas?: { loansToday: number; returnsToday: number };
  overdue?: {
    id: string;
    dueAt: IsoDate;
    daysOverdue: number;
    item: { barcode: string; book: { id: string; title: string } };
    member: { id: string; memberCode: string; classOrMajor: string | null; user: { name: string } };
  }[];
  ready?: {
    id: string;
    expiresAt: IsoDate | null;
    expiresToday: boolean;
    book: { id: string; title: string };
    item: { barcode: string } | null;
    member: { memberCode: string; user: { name: string } };
  }[];
  checkouts14d?: { date: string; checkouts: number; returns: number; closed: boolean; today: boolean }[];
  popularThisMonth?: { id: string; title: string; callNumber: string; loans: number }[];
  activity?: { id: string; action: string; createdAt: IsoDate; actorName: string | null }[];
}

export interface ReportTable {
  type?: string;
  title?: string;
  period?: { from: string; to: string };
  columns: { key: string; label: string; type?: "date" | "number" }[];
  rows: Record<string, string | number | null>[];
}

export interface AiIndexStatus {
  embedded: number;
  total: number;
  model: string;
  reindexing: boolean;
  progress: number | null;
}
