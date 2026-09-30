// Pure route-gating decision used by proxy.ts. Relative imports keep it runnable
// under plain Node for route-access.check.ts.
import { LOGIN_PATH, PROTECTED_ROUTES, ROLE_HOME } from "../../shared/constants.ts";
import { ROLES, type Role } from "../../shared/types/enums.ts";

export type AccessDecision = { action: "allow" } | { action: "redirect"; to: string };

/**
 * Reads the `role` claim from a JWT payload WITHOUT verifying the signature.
 * Only safe for UX routing; every API call is still authorized by the backend.
 */
export function readRoleClaim(token: string | undefined, now = Date.now()): Role | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { role, exp } = JSON.parse(json) as { role?: unknown; exp?: unknown };
    // An expired access token is "no role": otherwise /masuk would bounce the user
    // back to /staf after a failed refresh and loop forever.
    if (typeof exp === "number" && exp * 1000 <= now) return null;
    return ROLES.includes(role as Role) ? (role as Role) : null;
  } catch {
    return null;
  }
}

/**
 * Where to go after login. Only same-site paths the role may open are honored,
 * so `?next=https://evil.example` or `?next=//evil.example` can't redirect off-site.
 */
export function safeNextPath(next: string | null | undefined, role: Role): string {
  const home = ROLE_HOME[role];
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return home;
  const pathname = next.split(/[?#]/)[0];
  if (pathname === LOGIN_PATH) return home;
  const rule = PROTECTED_ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return rule && !rule.roles.includes(role) ? home : next;
}

export function resolveAccess(
  pathname: string,
  session: { accessToken?: string; hasRefreshToken: boolean },
): AccessDecision {
  const role = readRoleClaim(session.accessToken);
  // Expired/missing access token but a refresh token exists: let the page load,
  // the api client refreshes on the first 401.
  const signedIn = role !== null || session.hasRefreshToken;

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return role ? { action: "redirect", to: ROLE_HOME[role] } : { action: "allow" };
  }

  const rule = PROTECTED_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!rule) return { action: "allow" };
  if (!signedIn) {
    return { action: "redirect", to: `${LOGIN_PATH}?next=${encodeURIComponent(pathname)}` };
  }
  if (role && !rule.roles.includes(role)) return { action: "redirect", to: ROLE_HOME[role] };
  return { action: "allow" };
}
