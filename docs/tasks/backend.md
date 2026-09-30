# Backend Tasks

`backend/` — NestJS 12, Prisma 7. Termasuk task `[AI]` (module `ai` di NestJS).

Sumber: PRD §10 (dipindah ke sini — file ini yang di-update, bukan PRD). Format: `- [ ]` belum, `- [x]` selesai, `- [~]` sedang dikerjakan. ID task stabil; jangan dinomori ulang.


## Phase 0: Foundation & DevOps

### 0.2 Scaffold service
- [x] **BE-0.2.1** Scaffold `backend/` dengan NestJS 12 CLI mode ESM (Vitest + oxlint)
- [x] **BE-0.2.2** Set `backend/tsconfig.json` strict + `moduleResolution: nodenext`

## Phase 1: Backend Core & Database

### 1.0 Scaffold via Nest CLI (lihat §9.6)
- [x] **BE-1.0.1** Jalankan `nest g module infra/prisma` — *dipindah ke `src/infra/prisma/`*
- [x] **BE-1.0.2** Jalankan `nest g service infra/prisma --no-spec` — *mengikuti pola PrismaService bigboss (ConfigService + PrismaPg), import dari `src/generated/prisma/client.js`*
- [x] **BE-1.0.3** Jalankan `nest g resource modules/auth --no-spec` (REST, CRUD: Yes) — *semua resource digenerate lalu DTO class-validator & route CRUD bawaan diganti*
- [x] **BE-1.0.4** Jalankan `nest g resource modules/users --no-spec`
- [x] **BE-1.0.5** Jalankan `nest g resource modules/members --no-spec`
- [x] **BE-1.0.6** Jalankan `nest g resource modules/catalog --no-spec`
- [x] **BE-1.0.7** Jalankan `nest g resource modules/items --no-spec`
- [x] **BE-1.0.8** Jalankan `nest g resource modules/policies --no-spec`
- [x] **BE-1.0.9** Jalankan `nest g resource modules/circulation --no-spec`
- [x] **BE-1.0.10** Jalankan `nest g resource modules/fines --no-spec`
- [x] **BE-1.0.11** Jalankan `nest g resource modules/holds --no-spec`
- [x] **BE-1.0.12** Jalankan `nest g resource modules/me --no-spec`
- [x] **BE-1.0.13** Jalankan `nest g resource modules/search --no-spec`
- [x] **BE-1.0.14** Jalankan `nest g resource modules/notifications --no-spec`
- [x] **BE-1.0.15** Jalankan `nest g resource modules/reports --no-spec`
- [x] **BE-1.0.16** Jalankan `nest g resource modules/settings --no-spec`
- [x] **BE-1.0.17** Jalankan `nest g resource modules/audit --no-spec`
- [x] **BE-1.0.18** Jalankan `nest g resource modules/health --no-spec`
- [x] **BE-1.0.19** Hapus semua folder `entities/` hasil generate — *folder `dto/` bawaan juga dihapus, diganti Zod*
- [x] **BE-1.0.20** Verifikasi semua module terdaftar di `app.module.ts` dan `pnpm build` lolos — *+ module `privacy` (nest g module)*

### 1.1 Prisma 7 setup
- [x] **BE-1.1.1** Buat `backend/prisma.config.ts` (schema path, migrations path, datasource url dari env) — *di-rename dari `prisma7.config.ts`; seed: `node --import tsx prisma/seed.ts`*
- [x] **BE-1.1.2** Buat `backend/prisma/schema.prisma` generator `prisma-client` output `../generated/prisma` + datasource postgresql dengan extensions — *output tetap `src/generated/prisma` (di dalam rootDir build); extensions `vector, pg_trgm`*
- [x] **BE-1.1.3** Tambah model `User`, `RefreshToken` ke schema
- [x] **BE-1.1.4** Tambah model `Member`, `LoanPolicy`, `Holiday` ke schema
- [x] **BE-1.1.5** Tambah model `Book`, `Author`, `BookAuthor`, `Subject`, `BookSubject`, `Publisher`, `ShelfLocation` ke schema
- [x] **BE-1.1.6** Tambah model `Item` ke schema
- [x] **BE-1.1.7** Tambah model `Loan`, `Fine`, `FinePayment`, `Hold` ke schema
- [x] **BE-1.1.8** Tambah model `Notification`, `AuditLog`, `Setting`, `BookEmbedding` ke schema — *enum NotificationType punya `FINE_ISSUED` (email denda); `Loan.memberId` nullable untuk anonimisasi*
- [x] **BE-1.1.9** Generate migrasi awal `init` — *dibuat via `migrate diff` + `migrate deploy` karena DB sudah berisi extension dari init.sql*
- [x] **BE-1.1.10** Buat migrasi custom: kolom generated `Book.searchVector` + GIN index — *BE-1.1.10–13 + sequence barcode/kode anggota di satu migrasi `search_indexes`. Index GIN dideklarasikan juga di schema; HNSW tetap custom (migrate dev selalu ingin men-drop-nya — hapus baris itu)*
- [x] **BE-1.1.11** Buat migrasi custom: GIN trigram index `Book.title`
- [x] **BE-1.1.12** Buat migrasi custom: partial unique index loan aktif per item
- [x] **BE-1.1.13** Buat migrasi custom: HNSW index `BookEmbedding.embedding`
- [x] **BE-1.1.14** Buat `backend/prisma/seed.ts` (admin default, LoanPolicy STUDENT & STAFF, setting default)

### 1.2 Infra modules
- [x] **BE-1.2.1** Isi `src/infra/prisma/prisma.service.ts` hasil generate (PrismaClient + adapter-pg, lifecycle hooks)
- [x] **BE-1.2.2** Update `src/infra/prisma/prisma.module.ts` hasil generate (`@Global()`, export PrismaService)
- [x] **BE-1.2.3** Buat `src/infra/config/env.schema.ts` (Zod schema validasi env)
- [x] **BE-1.2.4** Buat `src/infra/config/config.module.ts` — *cukup `ConfigModule.forRoot({ validate: validateEnv })` di app.module*
- [x] **BE-1.2.5** Buat `src/infra/redis/redis.module.ts`
- [x] **BE-1.2.6** Buat `src/infra/queue/queue.module.ts` (BullMQ root + registrasi queue `mail`, `fines`, `holds`, `embeddings`) — *queue tambahan: `members`, `reminders`, `privacy` (satu queue per job terjadwal)*
- [x] **BE-1.2.7** Buat `src/infra/storage/storage.service.ts` (upload/delete/presigned URL MinIO) — *dua driver: `local` (default dev, folder `uploads/` disajikan di `/uploads`) dan `s3` (MinIO/S3 production)*
- [x] **BE-1.2.8** Buat `src/infra/mail/mail.service.ts` (Nodemailer transport + render template)
- [x] **BE-1.2.9** Buat `src/infra/logger/logger.module.ts` (pino + request id)

### 1.3 Cross-cutting
- [x] **BE-1.3.1** Buat `src/main.ts` (helmet, cookie-parser, CORS whitelist, global prefix, graceful shutdown)
- [x] **BE-1.3.2** Buat `src/common/filters/http-exception.filter.ts` (format error konsisten + errorCode) — *body datar `{ statusCode, errorCode, message, details }`, details validasi = map field → pesan[] (kontrak frontend `lib/api-client.ts`)*
- [x] **BE-1.3.3** Buat `src/common/interceptors/response.interceptor.ts` (envelope `{ data, meta }`)
- [x] **BE-1.3.4** Buat `src/common/pagination/pagination.schema.ts` + helper `paginate()`
- [x] **BE-1.3.5** Buat `src/common/guards/throttler.config.ts` (rate limit global) — *in-memory per proses (cukup single instance)*
- [x] **BE-1.3.6** Buat `src/common/guards/csrf.guard.ts` (double-submit token untuk mutasi)
- [x] **BE-1.3.7** Buat `src/modules/health/health.controller.ts`
- [x] **BE-1.3.8** Buat `src/modules/audit/audit.service.ts` (`log(actor, action, entity, metadata)`)
- [x] **BE-1.3.9** Buat `src/common/utils/date.util.ts` (hitung due date dengan skip holiday, timezone Asia/Jakarta)
- [x] **BE-1.3.10** Buat `src/common/utils/date.util.spec.ts`

## Phase 2: Auth, Staff & Members

### 2.1 Auth backend
- [x] **BE-2.1.1** Buat `modules/auth/dto/login.dto.ts` (Zod)
- [x] **BE-2.1.2** Buat `modules/auth/dto/change-password.dto.ts`
- [x] **BE-2.1.3** Buat `modules/auth/password.service.ts` (Argon2id hash/verify)
- [x] **BE-2.1.4** Buat `modules/auth/token.service.ts` (sign/verify access, issue/rotate/revoke refresh)
- [x] **BE-2.1.5** Buat `modules/auth/auth.service.ts` (login, refresh, logout, changePassword)
- [x] **BE-2.1.6** Buat `modules/auth/auth.controller.ts` (set/clear httpOnly cookies) — *cookie `access_token`/`refresh_token`/`csrf_token` sesuai frontend `shared/constants.ts`; refresh & logout tanpa CSRF agar cookie basi selalu bisa dibersihkan*
- [x] **BE-2.1.7** Buat `common/guards/jwt-auth.guard.ts`
- [x] **BE-2.1.8** Buat `common/guards/roles.guard.ts` + `common/decorators/roles.decorator.ts`
- [x] **BE-2.1.9** Buat `common/decorators/current-user.decorator.ts`
- [x] **BE-2.1.10** Buat `common/decorators/public.decorator.ts`
- [x] **BE-2.1.11** Buat `modules/auth/login-throttle.guard.ts` (5x/15 menit per akun+IP via Redis) — *rate limit login ada di `auth.service.ts` via Redis, bukan guard terpisah*
- [x] **BE-2.1.12** Buat `modules/auth/auth.service.spec.ts`

### 2.2 Staff & members backend
- [x] **BE-2.2.1** Buat `modules/users/users.service.ts` (CRUD staf)
- [x] **BE-2.2.2** Buat `modules/users/users.controller.ts` (ADMIN only) — *route `/staff`, list berupa array (bukan paginasi) sesuai frontend*
- [x] **BE-2.2.3** Buat `modules/members/dto/member.dto.ts` (create/update/query)
- [x] **BE-2.2.4** Buat `modules/members/members.service.ts` (CRUD, generate memberCode, lookup)
- [x] **BE-2.2.5** Buat `modules/members/members.controller.ts`
- [x] **BE-2.2.6** Buat `modules/members/member-import.service.ts` (parse CSV, validasi per baris, laporan gagal)
- [x] **BE-2.2.7** Buat `modules/members/member-status.job.ts` (set EXPIRED harian) — *BullMQ job scheduler harian*

## Phase 4: Catalog & Items

### 4.1 Catalog backend
- [x] **BE-4.1.1** Buat `modules/catalog/dto/book.dto.ts`
- [x] **BE-4.1.2** Buat `modules/catalog/books.service.ts` (CRUD, relasi author/subject, soft delete dengan guard pinjaman aktif) — *master data dikirim sebagai nama, dibuat otomatis; presenter kartu buku di `book.presenter.ts`*
- [x] **BE-4.1.3** Buat `modules/catalog/books.controller.ts`
- [x] **BE-4.1.4** Buat `modules/catalog/isbn-lookup.service.ts` (Open Library, timeout 3s, map ke BookDraft)
- [x] **BE-4.1.5** Buat `modules/catalog/cover.service.ts` (validasi mime/size, resize 2 ukuran via sharp, upload MinIO)
- [x] **BE-4.1.6** Buat `modules/catalog/master-data.controller.ts` (authors, publishers, subjects, shelves) — *route generik `/master-data/:kind` (`authors|publishers|subjects|shelf-locations`); ShelfLocation `{ code, name }`*
- [x] **BE-4.1.7** Buat `modules/catalog/master-data.service.ts`
- [x] **BE-4.1.8** Buat `modules/catalog/book-events.ts` (emit `book.upserted` / `book.deleted` → enqueue embeddings)

### 4.2 Items backend
- [x] **BE-4.2.1** Buat `modules/items/dto/item.dto.ts`
- [x] **BE-4.2.2** Buat `modules/items/item-state.machine.ts` (transisi status valid)
- [x] **BE-4.2.3** Buat `modules/items/item-state.machine.spec.ts`
- [x] **BE-4.2.4** Buat `modules/items/barcode.service.ts` (generate `PST-YYYY-seq6` dengan sequence Postgres)
- [x] **BE-4.2.5** Buat `modules/items/items.service.ts` (create batch N eksemplar, update, lookup by barcode)
- [x] **BE-4.2.6** Buat `modules/items/items.controller.ts` — *+ `GET /items/labels?ids=` menghasilkan PDF A4 Code128 (pdfkit + bwip-js); `shelfLocationId` wajib saat membuat eksemplar*

## Phase 6: Circulation & Fines

### 6.1 Policies & holidays backend
- [x] **BE-6.1.1** Buat `modules/policies/policies.service.ts` (get by memberType, update)
- [x] **BE-6.1.2** Buat `modules/policies/policies.controller.ts` (ADMIN)
- [x] **BE-6.1.3** Buat `modules/policies/holidays.service.ts` + controller

### 6.2 Circulation backend
- [x] **BE-6.2.1** Buat `modules/circulation/dto/checkout.dto.ts` (memberCode + barcodes[])
- [x] **BE-6.2.2** Buat `modules/circulation/dto/checkin.dto.ts`
- [x] **BE-6.2.3** Buat `modules/circulation/circulation.rules.ts` (fungsi murni validasi checkout & renew, return daftar alasan tolak)
- [x] **BE-6.2.4** Buat `modules/circulation/circulation.rules.spec.ts`
- [x] **BE-6.2.5** Buat `modules/circulation/checkout.service.ts` (transaksi, conditional update status item, create loan, audit) — *semantik batch parsial sesuai frontend: `{ loans: Loan[], rejected[] }`; blokir level anggota → 422*
- [x] **BE-6.2.6** Buat `modules/circulation/checkin.service.ts` (tutup loan, hitung denda, delegasi ke holds, audit)
- [x] **BE-6.2.7** Buat `modules/circulation/renew.service.ts`
- [x] **BE-6.2.8** Buat `modules/circulation/lost-damaged.service.ts`
- [x] **BE-6.2.9** Buat `modules/circulation/circulation.controller.ts` — *+ `/circulation/checkout/preview`, `GET /loans`, `POST /loans/:id/remind`*
- [x] **BE-6.2.10** Buat `modules/circulation/checkout.service.spec.ts` (termasuk race condition item yang sama) — *race condition diuji nyata di `test/e2e/circulation.e2e-spec.ts` (DB test), bukan unit dengan mock*

### 6.3 Fines backend
- [x] **BE-6.3.1** Buat `modules/fines/fine.calculator.ts` (hari telat minus holiday, cap max)
- [x] **BE-6.3.2** Buat `modules/fines/fine.calculator.spec.ts`
- [x] **BE-6.3.3** Buat `modules/fines/fines.service.ts` (list, pay parsial, waive dengan alasan)
- [x] **BE-6.3.4** Buat `modules/fines/fines.controller.ts`
- [x] **BE-6.3.5** Buat `modules/fines/overdue-fines.processor.ts` (BullMQ repeatable harian update denda berjalan)

## Phase 7: Holds (Reservasi)

### 7.1 Holds backend
- [x] **BE-7.1.1** Buat `modules/holds/dto/hold.dto.ts`
- [x] **BE-7.1.2** Buat `modules/holds/holds.service.ts` (create dengan validasi, cancel, queue position)
- [x] **BE-7.1.3** Buat `modules/holds/hold-allocation.service.ts` (`allocateOnReturn(itemId)` → READY + ON_HOLD + notif)
- [x] **BE-7.1.4** Buat `modules/holds/hold-allocation.service.spec.ts`
- [x] **BE-7.1.5** Buat `modules/holds/hold-expiry.processor.ts` (job expire + realokasi)
- [x] **BE-7.1.6** Buat `modules/holds/holds.controller.ts`

## Phase 8: OPAC, Search & Member Portal

### 8.1 Search backend
- [x] **BE-8.1.1** Buat `modules/search/dto/search.dto.ts` (q, filters, page)
- [x] **BE-8.1.2** Buat `modules/search/fulltext.repository.ts` (tsvector `simple` + trigram similarity, raw SQL via Prisma `$queryRaw`)
- [x] **BE-8.1.3** Buat `modules/search/semantic-search.adapter.ts` (panggil `AiSearchService`, timeout 800ms, fallback kosong bila gagal)
- [x] **BE-8.1.4** Buat `modules/search/rrf.ts` (Reciprocal Rank Fusion, k=60)
- [x] **BE-8.1.5** Buat `modules/search/rrf.spec.ts`
- [x] **BE-8.1.6** Buat `modules/search/search.service.ts` (hybrid + fallback + tandai sumber hasil) — *filter diterapkan setelah RRF; kandidat 200 full-text + 50 semantik*
- [x] **BE-8.1.7** Buat `modules/search/search.controller.ts` (public, rate limited)

### 8.2 Member portal backend
- [x] **BE-8.2.1** Buat `modules/me/me.service.ts` (loans, holds, fines, history paginated)
- [x] **BE-8.2.2** Buat `modules/me/me.controller.ts` (MEMBER, data milik sendiri saja)
- [x] **BE-8.2.3** Buat `modules/me/recommendations.service.ts` (panggil `AiRecommendService` dengan N loan terakhir, fallback koleksi populer)

## Phase 9: Notifications

### 9.1 Backend
- [x] **BE-9.1.1** Buat `modules/notifications/templates/*.hbs` — satu file per jenis email (6 template) — *CHECKOUT_CONFIRMATION, DUE_REMINDER, OVERDUE, HOLD_READY, HOLD_EXPIRED, FINE_ISSUED*
- [x] **BE-9.1.2** Buat `modules/notifications/notifications.service.ts` (`notify(memberId, type, payload)` → DB + enqueue mail)
- [x] **BE-9.1.3** Buat `modules/notifications/mail.processor.ts` (BullMQ worker, retry 3x backoff exponential)
- [x] **BE-9.1.4** Buat `modules/notifications/due-reminder.processor.ts` (job harian H-2 & overdue 1/3/7)
- [x] **BE-9.1.5** Buat `modules/notifications/notifications.controller.ts` (list + mark read untuk portal) — *`GET /me/notifications` (array `{ title, body }`), `POST /notifications/:id/read`*

## Phase 10: Reports & Admin

### 10.1 Reports backend
- [x] **BE-10.1.1** Buat `modules/reports/dashboard.service.ts` (KPI hari ini) — *+ `GET /opac/home` untuk beranda OPAC*
- [x] **BE-10.1.2** Buat `modules/reports/report-queries.ts` (satu fungsi query per laporan: circulation, popular, dead-stock, active-members, by-class, fines, lost-damaged)
- [x] **BE-10.1.3** Buat `modules/reports/export.service.ts` (ExcelJS XLSX + CSV streaming)
- [x] **BE-10.1.4** Buat `modules/reports/reports.controller.ts` (audit log saat export)

### 10.3 Admin
- [x] **BE-10.3.1** Buat `modules/settings/settings.service.ts` + controller (profil perpustakaan, timezone)
- [x] **BE-10.3.2** Buat `modules/audit/audit.controller.ts` (search audit log, ADMIN)
- [x] **BE-10.3.3** Buat `modules/privacy/anonymize.processor.ts` (job anonimisasi riwayat sesuai retensi) — *module `privacy`; retensi dari setting `historyRetentionYears`*

## Phase 11: AI Module (NestJS)

### 11.1 Scaffold & core
- [x] **BE-11.1.1** Jalankan `nest g module modules/ai`
- [x] **BE-11.1.2** Tambah env `OPENROUTER_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMS` ke `src/infra/config/env.schema.ts`
- [x] **BE-11.1.3** `[AI]` Buat `modules/ai/openrouter.client.ts` (`@openrouter/sdk` embeddings batch, retry 2x, timeout)
- [x] **BE-11.1.4** `[AI]` Buat `modules/ai/document-builder.ts` (fungsi murni: gabung field buku → teks + SHA-256 content hash)
- [x] **BE-11.1.5** `[AI]` Buat `modules/ai/document-builder.spec.ts`
- [x] **BE-11.1.6** `[AI]` Buat `modules/ai/vector.repository.ts` (upsert/delete/nearest via `$executeRaw`/`$queryRaw`, operator `<=>`)

### 11.2 Services
- [x] **BE-11.2.1** `[AI]` Jalankan `nest g service modules/ai/ai-embedding --flat --no-spec` → upsert skip jika hash sama, delete
- [x] **BE-11.2.2** `[AI]` Jalankan `nest g service modules/ai/ai-search --flat --no-spec` → embed query → cosine top-K
- [x] **BE-11.2.3** `[AI]` Jalankan `nest g service modules/ai/ai-recommend --flat --no-spec` → similar by id, centroid personal + exclude
- [x] **BE-11.2.4** `[AI]` Buat `modules/ai/centroid.ts` (fungsi murni rata-rata vektor + normalisasi)
- [x] **BE-11.2.5** `[AI]` Buat `modules/ai/centroid.spec.ts`
- [x] **BE-11.2.6** `[AI]` Buat `modules/ai/embedding-sync.processor.ts` (BullMQ consume `book.upserted/deleted`)
- [x] **BE-11.2.7** `[AI]` Buat `modules/ai/reindex.service.ts` (enqueue semua judul, progress di Redis)
- [x] **BE-11.2.8** `[AI]` Jalankan `nest g controller modules/ai --no-spec` → `POST /ai/reindex`, `GET /ai/status` (ADMIN)
- [x] **BE-11.2.9** Export `AiSearchService` & `AiRecommendService` dari `ai.module.ts`, import di `search` & `me`

## Phase 12: Hardening & Deploy

### 12.1 Quality
- [x] **BE-12.1.1** Buat `test/e2e/circulation.e2e-spec.ts` (checkout → overdue → checkin → denda → hold allocation) — *jalan dengan `pnpm test:e2e` (build dist → DB `<db>_test`, Redis db 1)*
