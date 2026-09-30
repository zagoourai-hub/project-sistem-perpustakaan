import { expect, test } from "@playwright/test";
import { loginAsStaff } from "./helpers";

// At phone width no page may scroll sideways: wide tables must scroll inside their own container.
// (Regression for flex/grid children that grew past the viewport because of min-width: auto.)
test.use({ viewport: { width: 390, height: 800 } });

const PAGES = ["/", "/katalog", "/bantuan", "/jam-buka", "/staf", "/staf/sirkulasi?mode=pinjam", "/staf/katalog", "/staf/katalog/baru", "/staf/master-data", "/staf/anggota", "/staf/reservasi", "/staf/denda", "/staf/laporan"];

test("no horizontal scroll at 390px", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsStaff(page);
  const wide: string[] = [];
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 0) wide.push(`${path}: +${over}px`);
  }
  expect(wide).toEqual([]);
});
