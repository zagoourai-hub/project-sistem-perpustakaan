import { expect, test } from "@playwright/test";

// FE-12.1.2. Guest flow: search, open the detail page, see the copies table. Reservation needs a member session,
// so a guest only sees the login prompt when every copy is on loan.
const QUERY = process.env.E2E_QUERY ?? "laskar";

test("guest searches the catalog and opens a book", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Pencarian buku" }).fill(QUERY);
  await page.getByRole("button", { name: "Cari" }).click();
  await expect(page).toHaveURL(/\/katalog\?q=/);

  const first = page.getByRole("list").getByRole("link").first();
  await expect(first).toBeVisible();
  await first.click();

  await expect(page).toHaveURL(/\/buku\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("filters live in the URL", async ({ page }) => {
  await page.goto(`/katalog?q=${QUERY}`);
  await page.getByRole("checkbox", { name: "Tersedia sekarang" }).click(); // controlled by the URL, so no check() state assertion
  await expect(page).toHaveURL(/available=true/);
});

test("every link in the public header and footer resolves", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page.locator("header a[href^='/'], footer a[href^='/']").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")!))]);
  for (const href of hrefs) {
    const res = await page.goto(href);
    expect(res?.status(), href).toBeLessThan(400);
  }
});
