// Runnable check: node lib/auth/route-access.check.ts
import assert from "node:assert/strict";
import { readRoleClaim, resolveAccess, safeNextPath } from "./route-access.ts";

const jwt = (payload: object) =>
  `h.${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.s`;
const staff = jwt({ sub: "u1", role: "LIBRARIAN" });
const member = jwt({ sub: "u2", role: "MEMBER" });

assert.equal(readRoleClaim(staff), "LIBRARIAN");
assert.equal(readRoleClaim(jwt({ role: "ROOT" })), null);
assert.equal(readRoleClaim("garbage"), null);
assert.equal(readRoleClaim(undefined), null);
// Expired token → no role, so a failed refresh can't loop /masuk ↔ /staf.
const expired = jwt({ role: "LIBRARIAN", exp: Math.floor(Date.now() / 1000) - 60 });
assert.equal(readRoleClaim(expired), null);
assert.equal(readRoleClaim(jwt({ role: "MEMBER", exp: Math.floor(Date.now() / 1000) + 600 })), "MEMBER");
assert.deepEqual(resolveAccess("/masuk", { accessToken: expired, hasRefreshToken: true }), { action: "allow" });

const out = { hasRefreshToken: false };
assert.deepEqual(resolveAccess("/katalog", out), { action: "allow" });
assert.deepEqual(resolveAccess("/staf/sirkulasi", out), {
  action: "redirect",
  to: "/masuk?next=%2Fstaf%2Fsirkulasi",
});
// Expired access token + refresh cookie: let the client refresh.
assert.deepEqual(resolveAccess("/akun", { hasRefreshToken: true }), { action: "allow" });
assert.deepEqual(resolveAccess("/staf", { accessToken: staff, hasRefreshToken: true }), { action: "allow" });
assert.deepEqual(resolveAccess("/staf", { accessToken: member, hasRefreshToken: true }), {
  action: "redirect",
  to: "/akun",
});
assert.deepEqual(resolveAccess("/akun/kartu", { accessToken: staff, hasRefreshToken: true }), {
  action: "redirect",
  to: "/staf",
});
assert.deepEqual(resolveAccess("/masuk", { accessToken: member, hasRefreshToken: true }), {
  action: "redirect",
  to: "/akun",
});
// Prefix must match a path segment, not a substring.
assert.deepEqual(resolveAccess("/stafxyz", out), { action: "allow" });

// Post-login redirect: no open redirects, no cross-role jumps.
assert.equal(safeNextPath("/staf/sirkulasi?mode=pinjam", "LIBRARIAN"), "/staf/sirkulasi?mode=pinjam");
assert.equal(safeNextPath("/buku/123", "MEMBER"), "/buku/123");
assert.equal(safeNextPath("/staf", "MEMBER"), "/akun");
assert.equal(safeNextPath("https://evil.example", "MEMBER"), "/akun");
assert.equal(safeNextPath("//evil.example/x", "ADMIN"), "/staf");
assert.equal(safeNextPath("/\\evil.example", "ADMIN"), "/staf");
assert.equal(safeNextPath("/masuk", "ADMIN"), "/staf");
assert.equal(safeNextPath(null, "MEMBER"), "/akun");

console.log("route-access: ok");
