// Enum values mirror the backend Prisma enums (PRD §5.1, §9.3).
// Kept as const tuples so zod schemas can reuse them: z.enum(ROLES).

export const ROLES = ["ADMIN", "LIBRARIAN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const MEMBER_TYPES = ["STUDENT", "STAFF"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

export const MEMBER_STATUSES = ["ACTIVE", "SUSPENDED", "EXPIRED"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const ITEM_STATUSES = [
  "AVAILABLE",
  "ON_LOAN",
  "ON_HOLD",
  "LOST",
  "DAMAGED",
  "IN_REPAIR",
  "WITHDRAWN",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_CONDITIONS = ["GOOD", "FAIR", "POOR"] as const;
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

export const ITEM_SOURCES = ["PURCHASE", "DONATION"] as const;
export type ItemSource = (typeof ITEM_SOURCES)[number];

export const FINE_TYPES = ["OVERDUE", "LOST", "DAMAGED"] as const;
export type FineType = (typeof FINE_TYPES)[number];

export const FINE_STATUSES = ["UNPAID", "PAID", "WAIVED"] as const;
export type FineStatus = (typeof FINE_STATUSES)[number];

export const HOLD_STATUSES = ["WAITING", "READY", "FULFILLED", "CANCELLED", "EXPIRED"] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "CHECKOUT_CONFIRMATION",
  "DUE_REMINDER",
  "OVERDUE",
  "HOLD_READY",
  "HOLD_EXPIRED",
  "FINE_ISSUED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const REPORT_TYPES = [
  "circulation",
  "popular",
  "dead-stock",
  "active-members",
  "by-class",
  "fines",
  "lost-damaged",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const EXPORT_FORMATS = ["xlsx", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
