import { NextResponse, type NextRequest } from "next/server";
import { resolveAccess } from "@/lib/auth/route-access";
import { AUTH_COOKIES } from "@/shared/constants";

// Route gating only (PRD FR-A3): redirects signed-out users and wrong roles.
// Not a security boundary — the backend guards every endpoint.
export function proxy(request: NextRequest) {
  const decision = resolveAccess(request.nextUrl.pathname, {
    accessToken: request.cookies.get(AUTH_COOKIES.access)?.value,
    hasRefreshToken: request.cookies.has(AUTH_COOKIES.refresh),
  });
  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staf/:path*", "/akun/:path*", "/masuk", "/ganti-password"],
};
