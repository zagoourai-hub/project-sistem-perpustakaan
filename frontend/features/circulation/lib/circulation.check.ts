// Runnable check: node features/circulation/lib/circulation.check.ts
import assert from "node:assert/strict";
import { detectCodeType, normalizeCode } from "../../../lib/scanner/detect-code-type.ts";
import type { ItemWithBook, MemberSummary } from "../../../shared/types/models.ts";
import { memberBlockers, precheckItem, previewDueDate } from "./precheck.ts";

// ── Scan type detection (FR-H3) ──────────────────────────────────────────────
assert.equal(detectCodeType("PST-2026-000142"), "ITEM");
assert.equal(detectCodeType(" pst-2026-000142\n"), "ITEM");
assert.equal(detectCodeType("AGT-2024-0081"), "MEMBER");
assert.equal(detectCodeType("AGT-000001"), "MEMBER"); // seeded card without year (real dev DB)
assert.equal(detectCodeType("AGT-2026-000004"), "MEMBER");
assert.equal(detectCodeType("AGTX-1"), "UNKNOWN");
assert.equal(detectCodeType("9789793062792"), "ISBN");
assert.equal(detectCodeType("979-3062-79-7"), "ISBN"); // ISBN-10 with hyphens
assert.equal(detectCodeType("9789793062793"), "UNKNOWN"); // bad checksum
assert.equal(detectCodeType("HELLO"), "UNKNOWN");
assert.equal(normalizeCode(" agt-2024-0081 "), "AGT-2024-0081");

// ── Checkout precheck (FR-E1) ────────────────────────────────────────────────
const now = new Date("2026-09-28T09:00:00+07:00");
const member: MemberSummary = {
  id: "m1", userId: "u1", name: "Nadia Putri", email: "n@x.id", memberCode: "AGT-2024-0081",
  idNumber: "1", type: "STUDENT", classOrMajor: "XI IPA 2", phone: null, photoUrl: null,
  status: "ACTIVE", validUntil: "2027-06-30", emailReminders: true,
  activeLoans: 1, maxActiveLoans: 3, readyHolds: 0, unpaidFines: 8000, blockingFineThreshold: 20000, loanDays: 14,
};
const item = (over: Partial<ItemWithBook> = {}) =>
  ({ id: "i1", barcode: "PST-2026-000142", status: "AVAILABLE", heldForMemberId: null, ...over }) as ItemWithBook;

assert.equal(previewDueDate(14, now), "2026-10-12"); // mockup 05: "12 Okt 2026"
// Late evening UTC is already the next day in Jakarta.
assert.equal(previewDueDate(0, new Date("2026-09-28T18:30:00Z")), "2026-09-29");

assert.deepEqual(precheckItem(member, item(), [], now), { ok: true, dueAt: "2026-10-12" });
// Quota: 1 active + 1 queued fills 2 of 3 → third item still fits, fourth doesn't.
assert.equal(precheckItem(member, item({ barcode: "B" }), ["A"], now).ok, true);
assert.deepEqual(precheckItem(member, item({ barcode: "C" }), ["A", "B"], now), {
  ok: false,
  reasons: ["Kuota pinjam penuh (3/3)"],
});
assert.deepEqual(precheckItem(member, item(), ["PST-2026-000142"], now), {
  ok: false,
  reasons: ["Sudah ada di antrean"],
});
assert.equal(precheckItem(member, item({ status: "ON_HOLD", heldForMemberId: "m1" }), [], now).ok, true);
assert.deepEqual(precheckItem(member, item({ status: "ON_HOLD", heldForMemberId: "m2" }), [], now), {
  ok: false,
  reasons: ["Disimpan untuk reservasi anggota lain"],
});
assert.deepEqual(precheckItem(member, item({ status: "ON_LOAN" }), [], now), {
  ok: false,
  reasons: ["Eksemplar sedang dipinjam"],
});

// Member blockers: fines at the threshold block, expiry blocks.
assert.deepEqual(memberBlockers({ ...member, unpaidFines: 20000 }, now), ["Denda melewati batas blokir"]);
assert.deepEqual(memberBlockers({ ...member, validUntil: "2026-09-01" }, now), ["Keanggotaan sudah tidak berlaku"]);
assert.deepEqual(memberBlockers(member, now), []);

console.log("circulation: ok");
