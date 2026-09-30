# Ops Tasks

Monorepo, Docker, CI, deploy.

Sumber: PRD §10 (dipindah ke sini — file ini yang di-update, bukan PRD). Format: `- [ ]` belum, `- [x]` selesai, `- [~]` sedang dikerjakan. ID task stabil; jangan dinomori ulang.


## Phase 0: Foundation & DevOps

### 0.1 Monorepo & tooling
- [~] **OPS-0.1.1** Buat `pnpm-workspace.yaml` dengan package `frontend`, `backend` — *sengaja tidak dibuat: tiap app tetap punya lockfile sendiri (sesuai CLAUDE.md); root `package.json` mendelegasikan dengan `pnpm -C`*
- [x] **OPS-0.1.2** Buat root `package.json` dengan script `dev`, `build`, `lint`, `test` per workspace — *script via `pnpm -C backend|frontend` (tanpa workspace), + `infra`, `db:migrate`, `db:seed`*
- [x] **OPS-0.1.3** Buat `.editorconfig` dan `.gitignore` root — *+ `.gitattributes` (`*.sh` LF) dan `.dockerignore` root*
- [x] **OPS-0.1.4** Buat `.env.example` root berisi semua env var tiap service dengan komentar — *root `.env.example` = env production (compose prod); dev tetap `backend/.env.example` & `frontend/.env.example`*

### 0.3 Docker & infra lokal
- [x] **OPS-0.3.1** Buat `docker/docker-compose.yml` dengan service postgres (image pgvector/pgvector pg17), redis, minio, mailpit — *postgres, redis, mailpit; MinIO dihapus (image tidak dipublikasi lagi) → storage dev = folder lokal*
- [x] **OPS-0.3.2** Buat `docker/postgres/init.sql` untuk `CREATE EXTENSION vector, pg_trgm`
- [x] **OPS-0.3.3** Buat `docker/frontend/Dockerfile` multi-stage (standalone output) — *Next `output: "standalone"`; `BACKEND_URL` build-arg (rewrite `/api/v1` & `/uploads`)*
- [x] **OPS-0.3.4** Buat `docker/backend/Dockerfile` multi-stage (Node 24, pnpm deploy, prisma generate) — *Node 24 slim, `pnpm install --prod` (bukan `pnpm deploy`: bukan workspace); prisma/tsx jadi dependency runtime untuk migrate & seed*
- [x] **OPS-0.3.5** Tambah service frontend, backend ke compose dengan healthcheck & depends_on — *di compose dev lewat profile `app` (`docker compose --profile app up`)*

### 0.4 CI
- [x] **OPS-0.4.1** Buat `.github/workflows/ci.yml` (install, lint, typecheck, test per workspace) — *backend: lint, tsc, unit, migrate deploy, e2e (service postgres+redis); frontend: tsc + build (eslint masih rusak, FE-X.6)*
- [x] **OPS-0.4.2** Buat `.github/workflows/docker.yml` (build & push image ke GHCR on tag) — *matrix backend/frontend → `ghcr.io/<owner>/pustaka-*`*

## Phase 3: Design System

### 3.1 Tokens & foundation
- [x] **OPS-3.1.1** Salin `DESIGN.md` ke `docs/design/` dan ekspor Stitch ke `docs/design/image/` + `docs/design/screen/` sesuai penamaan §9.5.1

## Phase 12: Hardening & Deploy

### 12.2 Production
- [x] **OPS-12.2.1** Buat `docker/docker-compose.prod.yml` (tanpa mailpit, DB & Redis hanya di network internal) — *hanya frontend dipublikasikan; backend di network internal + egress; volume `uploads` untuk storage lokal*
- [x] **OPS-12.2.2** Buat `docker/backup/backup.sh` (pg_dump harian + retensi 30 hari) — *jalan sebagai service `backup` (loop harian, tanpa cron); `run --rm backup once` untuk manual*
- [x] **OPS-12.2.3** Buat `docker/backend/entrypoint.sh` (`prisma migrate deploy` lalu start) — *+ `entrypoint.sh seed` untuk seed data awal*
- [x] **OPS-12.2.4** Buat `docs/deploy/coolify.md` (setup resource, env, domain, healthcheck)
- [x] **OPS-12.2.5** Buat `docs/deploy/first-run.md` (seed admin, import anggota, import katalog awal)
