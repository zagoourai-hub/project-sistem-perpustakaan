// Every backend path the frontend calls, relative to /api/v1 (PRD §9.4).
// All paths are confirmed against the NestJS controllers (docs/api/README.md).
// Change them here only.

import type { ReportType } from "@/shared/types/enums";

export const endpoints = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    changePassword: "/auth/change-password",
    me: "/auth/me",
  },
  members: {
    list: "/members",
    one: (id: string) => `/members/${id}`,
    import: "/members/import",
    lookup: "/members/lookup",
    loans: (id: string) => `/members/${id}/loans`, // active loans
    resetPassword: (id: string) => `/members/${id}/reset-password`, // FR-A5
  },
  books: {
    list: "/books",
    one: (id: string) => `/books/${id}`,
    isbnLookup: (isbn: string) => `/books/isbn/${isbn}/lookup`,
    cover: (id: string) => `/books/${id}/cover`,
    items: (id: string) => `/books/${id}/items`,
    holds: (id: string) => `/books/${id}/holds`,
    similar: (id: string) => `/books/${id}/similar`,
  },
  masterData: {
    list: (kind: MasterDataKind) => `/master-data/${kind}`,
    one: (kind: MasterDataKind, id: string) => `/master-data/${kind}/${id}`,
  },
  items: {
    one: (id: string) => `/items/${id}`,
    lookup: "/items/lookup",
    labels: "/items/labels",
  },
  circulation: {
    checkout: "/circulation/checkout",
    checkin: "/circulation/checkin",
    renew: (loanId: string) => `/loans/${loanId}/renew`,
    markLost: (loanId: string) => `/loans/${loanId}/mark-lost`,
    remind: (loanId: string) => `/loans/${loanId}/remind`, // resend the overdue email for one loan
  },
  fines: {
    list: "/fines",
    one: (id: string) => `/fines/${id}`,
    payments: (id: string) => `/fines/${id}/payments`,
    waive: (id: string) => `/fines/${id}/waive`,
  },
  holds: {
    create: "/holds",
    one: (id: string) => `/holds/${id}`,
    list: "/holds", // staff list; ?status=READY = rak siap diambil
  },
  me: {
    card: "/me/card",
    loans: "/me/loans",
    holds: "/me/holds",
    fines: "/me/fines",
    history: "/me/history",
    recommendations: "/me/recommendations",
    notifications: "/me/notifications",
    settings: "/me/settings", // email reminder toggle (FR-J4)
  },
  notifications: {
    markRead: (id: string) => `/notifications/${id}/read`,
  },
  search: {
    query: "/search",
  },
  opac: {
    home: "/opac/home", // public: stats, newest, popular this month
  },
  reports: {
    dashboard: "/reports/dashboard",
    one: (type: ReportType) => `/reports/${type}`,
    export: (type: ReportType) => `/reports/${type}/export`,
  },
  admin: {
    policies: "/policies",
    policy: (memberType: string) => `/policies/${memberType}`,
    holidays: "/holidays",
    holiday: (id: string) => `/holidays/${id}`,
    staff: "/staff",
    staffOne: (id: string) => `/staff/${id}`,
    staffResetPassword: (id: string) => `/staff/${id}/reset-password`,
    settings: "/settings",
    settingsLogo: "/settings/logo",
    /** Public subset for the OPAC header/footer (no auth). */
    publicSettings: "/settings/public",
    auditLogs: "/audit-logs",
    aiReindex: "/ai/reindex",
    aiStatus: "/ai/status",
  },
} as const;

export type MasterDataKind = "authors" | "publishers" | "subjects" | "shelf-locations";
