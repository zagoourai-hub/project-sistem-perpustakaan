import type { Role } from "./types/enums";

/** Same-origin prefix; next.config rewrites it to the NestJS backend. */
export const API_PREFIX = "/api/v1";

// Cookie names set by the backend (PRD FR-A2). Access/refresh are httpOnly;
// the CSRF cookie is readable so axios can echo it in a header (double submit).
export const AUTH_COOKIES = {
  access: "access_token",
  refresh: "refresh_token",
  csrf: "csrf_token",
} as const;
export const CSRF_HEADER = "x-csrf-token";

export const LOGIN_PATH = "/masuk";
export const CHANGE_PASSWORD_PATH = "/ganti-password";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/staf",
  LIBRARIAN: "/staf",
  MEMBER: "/akun",
};

/** Route prefix → roles allowed. Checked in proxy.ts for UX only; the backend guards are authoritative. */
export const PROTECTED_ROUTES: { prefix: string; roles: readonly Role[] }[] = [
  { prefix: "/staf", roles: ["ADMIN", "LIBRARIAN"] },
  { prefix: "/akun", roles: ["MEMBER"] },
  { prefix: CHANGE_PASSWORD_PATH, roles: ["ADMIN", "LIBRARIAN", "MEMBER"] },
];

// Code formats (FR-B3, FR-H3): the TYPE is recognised by prefix, per the PRD.
// Backend generates PST-YYYY-NNNNNN and AGT-YYYY-NNNNNN, but seeded/migrated cards
// exist without the year (AGT-000001), so only the prefix + digits/dashes is required.
export const ITEM_BARCODE_PATTERN = /^PST-\d[\d-]*$/;
export const MEMBER_CODE_PATTERN = /^AGT-\d[\d-]*$/;
