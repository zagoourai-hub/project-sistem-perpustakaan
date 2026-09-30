import { expect, test } from "@playwright/test";
import { loginAsStaff } from "./helpers";

// FE-12.1.1. A USB scanner is a keyboard that types the code and presses Enter, so we simulate exactly that.
// Needs a seeded ACTIVE member (E2E_MEMBER_CODE) and an AVAILABLE copy (E2E_BARCODE).
const MEMBER = process.env.E2E_MEMBER_CODE ?? "AGT-000002";
const BARCODE = process.env.E2E_BARCODE ?? "PST-2026-000001";

test("staff checks a book out by scanning member card then barcode", async ({ page }) => {
  await loginAsStaff(page);

  // Make the test repeatable: return the copy first (a no-op error if it is already on the shelf).
  await page.goto("/staf/sirkulasi?mode=kembali");
  const returnScan = page.getByRole("textbox").first();
  await returnScan.fill(BARCODE);
  await returnScan.press("Enter");
  await page.waitForTimeout(1500);

  await page.goto("/staf/sirkulasi?mode=pinjam");

  const scan = page.getByRole("textbox").first();
  await scan.fill(MEMBER);
  await scan.press("Enter");
  await expect(page.getByText(MEMBER).first()).toBeVisible();

  await scan.fill(BARCODE);
  await scan.press("Enter");
  await expect(page.getByText(BARCODE).first()).toBeVisible();

  await page.getByRole("button", { name: /konfirmasi|pinjam/i }).last().click();
  await expect(page.getByRole("status").filter({ hasText: "berhasil dipinjam" })).toBeVisible();
});
