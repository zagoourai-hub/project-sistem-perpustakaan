import type { Page } from "@playwright/test";

export const STAFF = {
  identifier: process.env.E2E_STAFF_EMAIL ?? "qa-librarian@pustaka.local",
  password: process.env.E2E_STAFF_PASSWORD ?? "QaTest12345",
};

export async function loginAsStaff(page: Page) {
  await page.goto("/masuk");
  await page.getByRole("textbox", { name: "Email atau nomor induk" }).fill(STAFF.identifier);
  await page.getByRole("textbox", { name: "Kata sandi" }).fill(STAFF.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/staf");
}
