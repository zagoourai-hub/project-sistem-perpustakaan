import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAsStaff } from "./helpers";

// FE-12.1.3. Serious and critical WCAG A/AA violations fail the run; minor ones are only reported.
const PUBLIC = ["/", "/katalog", "/masuk"];
const STAFF_PAGES = ["/staf", "/staf/denda", "/staf/katalog", "/staf/anggota"];

async function audit(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking.map((v) => `${v.id}: ${v.nodes.length} node(s)`), path).toEqual([]);
}

for (const path of PUBLIC) test(`a11y ${path}`, async ({ page }) => audit(page, path));

test.describe("staff", () => {
  test.beforeEach(async ({ page }) => loginAsStaff(page));
  for (const path of STAFF_PAGES) test(`a11y ${path}`, async ({ page }) => audit(page, path));
});
