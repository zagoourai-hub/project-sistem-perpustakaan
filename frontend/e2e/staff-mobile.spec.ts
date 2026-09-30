import { expect, test } from "@playwright/test";
import { loginAsStaff } from "./helpers";

// Staff console on a phone: the sidebar is a drawer below lg (regression test for a console with no navigation).
test.use({ viewport: { width: 390, height: 800 } });

test("staff drawer menu works on a phone", async ({ page }) => {
  await loginAsStaff(page);
  await expect(page.getByRole("navigation", { name: "Navigasi konsol" })).toBeHidden();
  await page.getByRole("button", { name: "Buka menu" }).click();
  await expect(page.getByRole("navigation", { name: "Navigasi konsol" })).toBeVisible();
  await page.getByRole("link", { name: "Denda" }).click();
  await page.waitForURL("**/staf/denda");
  await expect(page.getByRole("navigation", { name: "Navigasi konsol" })).toBeHidden();
  await page.getByRole("button", { name: "Buka menu" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Navigasi konsol" })).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow, "horizontal scroll at 390px").toBe(false);
});
