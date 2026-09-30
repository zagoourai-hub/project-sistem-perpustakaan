# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Personal 
- Anda adalah zagoour assistenm pribadi saya, panggil saya dengan bigboss


## Project

**Pustaka** is a single-tenant library management system for a school or campus (catalog, circulation by barcode/QR scan, member portal/OPAC, holds, fines, reports, AI semantic search). The spec is `docs/project/PRD.md`, written in Indonesian. It holds the data model (§9.3), the REST API surface (§9.4, prefix `/api/v1`), the design direction (§9.5), backend scaffolding rules (§9.6), and a phased task list (§10). Read the relevant PRD section before starting a phase task.

Tasks are tracked in `docs/tasks/backend.md` (`[BE]` and `[AI]`), `docs/tasks/frontend.md` (`[FE]`) and `docs/tasks/ops.md` (`[OPS]`), not in PRD §10. Mark progress there: `[~]` in progress, `[x]` done, with a short italic note when the result deviates from the task text. Task IDs (e.g. `BE-6.2.3`) are stable and must never be renumbered.

The layout is `frontend/` (Next.js), `backend/` (NestJS, all `[BE]`/`[AI]` tasks implemented) and `docker/` (local dev compose). Each app is its own pnpm project with its own lockfile. There is no root workspace yet, so run commands from inside `frontend/` or `backend/`.

## Commands

Backend (`cd backend`, copy `.env.example` to `.env` first):
- Local infra: `docker compose -f ../docker/docker-compose.yml up -d` (Postgres + pgvector, Redis, Mailpit at http://localhost:8025)
- `pnpm start:dev`: dev server in watch mode on port 3001 (`PORT`); API at `/api/v1`
- `pnpm build` / `pnpm start:prod`
- `pnpm lint`: oxlint, type-aware (`no-floating-promises` is an error)
- `pnpm format`: prettier
- `pnpm test`: Vitest unit tests (`src/**/*.spec.ts`)
- `pnpm test:e2e`: runs `nest build`, then Vitest e2e (`test/**/*.e2e-spec.ts`) against the built `dist/`, because esbuild emits no decorator metadata. It uses a separate database `<db>_test` (created, migrated, truncated and seeded by `test/global-setup.ts`) and Redis db 1, so it never touches dev data.
- Stop `pnpm start:dev` before `pnpm test:e2e`: the e2e build rewrites `dist/`, which crashes a running watch server.
- Single test: `pnpm vitest run src/modules/fines/fine.calculator.spec.ts` or `pnpm vitest run -t "rrf"`
- Prisma: the config is `prisma.config.ts` (the default name). Use `pnpm prisma migrate deploy`, `pnpm prisma generate` and `pnpm prisma db seed` (seed: admin `admin@pustaka.local` / `Admin12345`, which must be changed at first login). `DATABASE_URL` is read from `backend/.env`.

Docker & deploy (run from the repo root; the build context is the root, see `.dockerignore`):
- Images: `docker/backend/Dockerfile` (the entrypoint runs `prisma migrate deploy`, and `seed` as an argument runs the seed) and `docker/frontend/Dockerfile` (Next `output: "standalone"`, with a `BACKEND_URL` build-arg baked into the `/api/v1` and `/uploads` rewrites).
- Full stack in containers for dev: `docker compose -f docker/docker-compose.yml --profile app up -d --build`.
- Production: `docker/docker-compose.prod.yml` with the root `.env.example` copied to `docker/.env`. Only `frontend` is published; it also runs the daily `backup` service. See `docs/deploy/coolify.md` and `docs/deploy/first-run.md`.
- CI: `.github/workflows/ci.yml`. Images are pushed to GHCR on `v*` tags by `.github/workflows/docker.yml`.
- The root `package.json` only delegates (`pnpm -C backend …`). There is no pnpm workspace on purpose.

Frontend (`cd frontend`):
- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` works (TypeScript is pinned to 6.x because typescript-eslint does not support 7 yet). Also run `npx tsc --noEmit -p .` and `pnpm build`.
- Logic checks are plain Node scripts that use native TS stripping, for example `node lib/api-client.check.ts` and `node lib/auth/route-access.check.ts`. Such files import with relative `.ts` paths (not `@/`) so Node can run them, which is why `allowImportingTsExtensions` is enabled.
- Browser tests: `E2E_BASE_URL=http://localhost:3100 pnpm e2e` (Playwright specs in `e2e/`, incl. axe a11y). They need the backend, a running frontend and the seeded QA accounts; credentials come from `E2E_STAFF_*` env vars.
- `next.config.ts` enables `cacheComponents` and `reactCompiler`. Server components must not read the clock while rendering (use `lib/today.ts`), and the root layout wraps the tree in `<Suspense>`.
- Copy `.env.example` to `.env.local`. `BACKEND_URL` (default `http://localhost:3001`) is read at build time by the rewrites. Run the backend on port 3001, because Next uses 3000.

## Backend architecture and conventions

- **NestJS 12, ESM only**: `"type": "module"` and `moduleResolution: nodenext`. Relative imports **must** use the `.js` extension (`import { X } from './x.service.js'`). Tests use Vitest globals, not Jest.
- **Prisma 7**: uses the `prisma-client` generator, which writes to `src/generated/prisma` (gitignored; run `prisma generate` after install), and connects through the `@prisma/adapter-pg` driver adapter. `PrismaService` (`src/infra/prisma/`, `@Global()`) extends the generated `PrismaClient` and builds the adapter from `ConfigService`. Keep this pattern; the owner asked for it.
- **Wire contract = the frontend's types.** Response shapes follow `frontend/shared/types/models.ts` and paths follow `frontend/lib/endpoints.ts`. The full reference is `docs/api/README.md`. Errors are flat, `{ statusCode, errorCode, message, details }`, where validation `details` is a `field → string[]` map (`common/filters/http-exception.filter.ts`). Cookies are `access_token`, `refresh_token` and `csrf_token`, and mutations send the header `x-csrf-token`. Shared presenters in `modules/catalog/` (`BookPresenter`: BookSummary/Item/ItemWithBook, `LoanPresenter`: Loan) produce these shapes, so reuse them instead of hand-building selects.
- **Layout:** `src/common/` (guards, decorators, filter, interceptor, pagination, date/format utils), `src/infra/` (config, prisma, redis, queue, mail, storage, logger), `src/modules/<domain>/`. Guards are global, in this order: throttler, JWT (`@Public()` opts out), roles (`@Roles()` / `@Staff()`), CSRF (`@SkipCsrf()`). Validation uses Zod schemas passed as `@Body({ schema })` / `@Query({ schema })`.
- **Storage:** `STORAGE_DRIVER=local` (dev) writes to `backend/uploads/`, served at `/uploads`. `s3` is for production MinIO/S3.
- **Scheduled jobs** are BullMQ job schedulers registered in each processor's `onModuleInit` (queues in `infra/queue/queue.module.ts`). Business rules are pure functions with specs (`circulation.rules.ts`, `fine.calculator.ts`, `item-state.machine.ts`, `rrf.ts`, `centroid.ts`, `common/utils/date.util.ts`).
- `@nestjs/observe` is wired in `app.module.ts` and passed to `NestFactory.create({ instrument })`. Its app key and secret are placeholders.
- **Scaffolding rule (PRD §9.6)**: generate modules, services, controllers and resources with the Nest CLI (`nest g resource modules/<name> --no-spec`, run in `backend/`); do not create them by hand. After generating a resource:
  - delete `entities/`, because models come from Prisma
  - replace class-validator DTOs with Zod 4 schemas plus inferred types (Standard Schema validation)
  - remove CRUD routes that are not used
- **Migrations**: the HNSW index, the partial unique index `Loan(itemId) WHERE returnedAt IS NULL`, the generated `Book.searchVector` column and the barcode/member-code sequences are custom SQL (`prisma/migrations/*_search_indexes`). `migrate dev` refuses to run non-interactively here. Instead:
  1. Create the migration folder by hand.
  2. Fill it with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`.
  3. Delete the always-present bogus lines `DROP INDEX "BookEmbedding_embedding_hnsw_idx"` and `ALTER TABLE "Book" ALTER COLUMN "searchVector" DROP DEFAULT`.
  4. Apply it with `prisma migrate deploy`. Production uses `migrate deploy` only.
- The AI module calls external embedding APIs only (OpenRouter) and stores the vectors in pgvector through raw queries. It does not host a model.

## Frontend architecture and conventions

- **Next.js 16.3 (App Router) with React 19.2.** Per `frontend/AGENTS.md`, this version has breaking changes compared with training data. Read the relevant guide in `frontend/node_modules/next/dist/docs/` before writing Next.js code, and follow its deprecation notices. For example, `proxy.ts` replaces middleware, and `LayoutProps<"/">` is a global type.
- Tailwind v4 is configured CSS-first in `app/globals.css`; there is no tailwind config file. shadcn/ui uses the `base-nova` style on `@base-ui/react`, not Radix, with Lucide icons. Add components with `pnpm dlx shadcn add <name>`. The `@/` alias points to the `frontend/` root.
- The app currently lives at `frontend/app/` with no `src/`. The PRD's planned route groups are `(public)`, `(auth)`, `(portal)/akun` and `(staff)/staf`.
- **Backend integration is same-origin.** The browser calls `/api/v1/*`, and `next.config.ts` rewrites that to `BACKEND_URL`. Because of this, the backend's httpOnly `access_token`/`refresh_token` cookies stay first-party, and axios's built-in XSRF support echoes the `csrf_token` cookie as the `x-csrf-token` header. Cookie and header names live in `shared/constants.ts`.
- **HTTP layer** (`lib/api-client.ts`):
  - It uses axios and unwraps the backend envelope `{ data, meta }` through `apiGet`/`apiGetPage`/`apiPost`/…
  - Every failure becomes an `ApiError` carrying `status`, `code` and `details`.
  - On a 401 it runs one shared `/auth/refresh` and retries. If the refresh fails, the handler that `app/providers.tsx` registers clears state and redirects to `/masuk`.
  - Pass `skipAuthRefresh: true` for calls where a 401 is expected, such as login and public search.
- **Server Components** fetch through `lib/server-fetch.ts` (`server-only`), which forwards the user's cookies. Client Components use TanStack Query hooks.
- **Per-domain code:**
  - `features/<domain>/api/<domain>.api.ts` exports a query-key factory (`xxxKeys`), a fetcher object (`xxxApi`) and the `useQuery`/`useMutation` hooks. Mutations invalidate by key prefix; circulation mutations invalidate members, books, fines, holds, me and the dashboard together.
  - `features/<domain>/schemas/*.schema.ts` holds Zod 4 form schemas with Indonesian messages.
  - Forms use React Hook Form with `zodResolver`. When a schema has `.default()` or `.transform()`, use `useForm<z.input<S>, unknown, z.output<S>>`. Map backend validation errors onto fields with `applyServerErrors` (`lib/form.ts`).
- **Endpoints:** every backend path is in `lib/endpoints.ts`. Paths commented `assumed` are guesses beyond PRD §9.4, so reconcile them with the NestJS controllers there and nowhere else.
- **`shared/`:**
  - `types/enums.ts` has the backend enums as const tuples, usable directly in `z.enum(...)`.
  - `types/api.ts` has the envelope, pagination and error contract; `types/models.ts` has the response shapes.
  - `props/` holds props for the design-system components. New shared props go here, not inline in components.
- **Zustand** is for client-only state. `stores/session.store.ts` mirrors `useMe()` so the user can be read synchronously. Server data stays in TanStack Query and must not be copied into stores.
- **Formatting:** use `lib/format.ts` for dates, Rupiah and day counts; it uses `id-ID` and `Asia/Jakarta`.
- **Styling tokens** (`app/globals.css`):
  - Tailwind colors are the Stitch profile roles, so mockup classes like `bg-surface-container-lowest` and `border-outline-variant` work as-is.
  - `primary` is oxblood #5B0D0D and `secondary` is moss. Neither is shadcn's neutral, so re-theme any component you add with `shadcn add` to these roles, the way `components/ui/*` already is.
  - Type utilities: `font-display` (Anton) with `text-display`/`text-h1`/`text-h2`/`text-h3`, `text-book-title`, `text-label`, `text-data-lg`, plus the custom `kicker` and `data` (mono with tabular numbers) utilities.
  - Radius tops out at 4px (`rounded`), with `rounded-xs` = 2px for chips and slips. Only overlays get a shadow (`shadow-md`/`shadow-overlay`).
- **Components:**
  - Design-system pieces are in `components/editorial/*`: CallNumber, DueSlip, IndexCard, BookCover, StatusBadge, PageHeading, EmptyState, and `bits.tsx` (Kbd, Stat, skeletons).
  - Layout shells are in `components/shell/*`, one per route group.
  - Form rows use `components/ui/field.tsx`.
- **Design rules (PRD §9.5), which must be followed for UI work**: an "editorial" look with a single oxblood accent. Color tokens follow the Stitch design-system profile "Pustaka Editorial" and use Material role names (`surface`, `surface-container-*`, `on-surface-variant`, `outline-variant`, `primary` #5B0D0D, `primary-container` #7A2420, …), defined in `docs/design/DESIGN.md`. Fonts are Anton for headlines only (never below 20px). Book titles use Work Sans semibold, except on the book detail page, where the title is the page headline in Anton, and on typographic cover placeholders. Work Sans is for UI, and IBM Plex Mono for data. Use 1px hairline rules instead of shadows, a 4px radius, and Lucide icons at stroke 1.5. Banned: gradients, glassmorphism, glows, emoji icons, Inter or Poppins, and hype copy. Before any `[FE]` page or component work, read `docs/design/README.md`. It maps each Stitch screen to its route, lists mockup bugs that must not be copied, and gives the hex→token and Material→Lucide mappings. The goal is to match the screenshots in `docs/design/image/*.png` as closely as possible. Read exact px values from the matching `docs/design/screen/*.html`, but never copy it: it is Tailwind v3 CDN with Material icons. Where the mockup and `docs/design/DESIGN.md` conflict, `DESIGN.md` wins.
- UI copy and route names are in Indonesian.
