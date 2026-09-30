import { defineConfig } from "@playwright/test";

// Runs against an already running stack (backend :3001 + `pnpm dev`). Uses the installed Chrome, so no browser download.
// E2E_BASE_URL defaults to the dev server; credentials come from E2E_STAFF_* (a LIBRARIAN or ADMIN account).
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: "list",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", channel: "chrome", trace: "retain-on-failure" },
});
