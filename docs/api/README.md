# Kontrak API Backend — Pustaka

Acuan integrasi frontend. Bentuk respons mengikuti `frontend/shared/types/models.ts`, dan path mengikuti `frontend/lib/endpoints.ts`. Sumber kebenaran tetap kode di `backend/src/modules/*/*.controller.ts` beserta DTO Zod di `dto/`. Alur utama sudah diuji end-to-end di browser (login, dasbor, meja sirkulasi pinjam/kembali, portal anggota + perpanjang).

## Menjalankan lokal

```bash
docker compose -f docker/docker-compose.yml up -d     # postgres (pgvector), redis, mailpit
cd backend
cp .env.example .env                                  # isi JWT_ACCESS_SECRET (≥ 32 karakter)
pnpm prisma migrate deploy && pnpm prisma db seed     # admin@pustaka.local / Admin12345 (wajib ganti)
pnpm start:dev                                        # http://localhost:3001/api/v1
cd ../frontend && pnpm dev                            # http://localhost:3000 (rewrite /api/v1 → :3001)
```

- Mailpit (untuk melihat email keluar): http://localhost:8025
- Upload (cover, logo) disimpan di `backend/uploads/` dan disajikan di `http://localhost:3001/uploads/...` (`STORAGE_DRIVER=local`). Production memakai `STORAGE_DRIVER=s3`.
- Browser selalu memanggil `/api/v1/*` di origin Next (same-origin). `BACKEND_URL=http://localhost:3001` dibaca oleh rewrite di `next.config.ts`.

## Konvensi

**Sukses:** `{ "data": ... }`. List berhalaman memakai bentuk `{ "data": [...], "meta": { page, pageSize, total, totalPages } }` dengan query `page` (mulai 1) dan `pageSize` (maks 100).

**Error** (bentuknya datar, dibaca `toApiError` di `lib/api-client.ts`):

```json
{ "statusCode": 400, "errorCode": "VALIDATION_ERROR", "message": "Input tidak valid",
  "details": { "name": ["Terlalu kecil: ..."], "idNumber": ["..."] } }
```

- Untuk `VALIDATION_ERROR` dan `DUPLICATE`, `details` berupa map `field → pesan[]`, sehingga `applyServerErrors` bisa langsung memetakannya ke field form. Pesan validasi berbahasa Indonesia (locale Zod `id`).
- Error domain memakai `errorCode` yang stabil (lihat daftar di bawah). Gunakan `errorCode` sebagai dasar logika, bukan `message`.

**Tanggal:** ISO 8601 UTC. Jatuh tempo = pukul 23:59:59.999 waktu perpustakaan (default `Asia/Jakarta`); hari libur digeser. Input tanggal murni berformat `YYYY-MM-DD`.

**Uang:** integer Rupiah.

**Kode:** kartu anggota `AGT-YYYY-NNNNNN` (QR), eksemplar `PST-YYYY-NNNNNN` (Code128).

## Autentikasi & CSRF

Nama cookie sama dengan `shared/constants.ts` (`AUTH_COOKIES`), semuanya SameSite=Lax:

| Cookie | httpOnly | Isi | Umur |
|---|---|---|---|
| `access_token` | ya | JWT akses | 15 menit |
| `refresh_token` | ya, path `/api/v1/auth` | refresh token (dirotasi, pemakaian ulang → semua sesi dicabut) | 7 hari |
| `csrf_token` | tidak | token double-submit | 7 hari |

- Setiap mutasi mengirim header `x-csrf-token` = isi cookie `csrf_token`. Axios sudah melakukannya lewat `xsrfCookieName`/`xsrfHeaderName`.
- Pengecualian: `/auth/login`, `/auth/refresh`, dan `/auth/logout`. Refresh dan logout harus tetap bisa membersihkan cookie basi, walaupun cookie `csrf_token` tidak ada.
- Status `401` → panggil `POST /auth/refresh` sekali. Bila refresh gagal, backend menghapus semua cookie dan mengembalikan `401 REFRESH_INVALID`.
- Status `403 PASSWORD_CHANGE_REQUIRED` → arahkan ke `/ganti-password`. Hanya `/auth/me`, `/auth/change-password`, dan `/auth/logout` yang tetap bisa diakses.
- Role: `ADMIN`, `LIBRARIAN` (keduanya disebut "staf"), dan `MEMBER`.

## Endpoint

Kolom akses: **P** publik, **M** anggota, **S** staf, **A** ADMIN, **L** semua yang login.

### Auth
| Method | Path | Akses | Respons / catatan |
|---|---|---|---|
| POST | `/auth/login` | P | body `{ identifier, password }`; identifier = email / nomor induk / kode anggota → `SessionUser` (+ `member`). Gagal 5×/15 menit per akun+IP → `429 LOGIN_LOCKED` |
| POST | `/auth/refresh` | P | → `SessionUser` |
| POST | `/auth/logout` | P | → `{ ok: true }` |
| POST | `/auth/change-password` | L | body `{ currentPassword, newPassword }` → `SessionUser` (menerbitkan sesi baru) |
| GET | `/auth/me` | L | `SessionUser` = `{ id, email, name, role, mustChangePassword, memberId, member }` |

### Publik (OPAC)
| Method | Path | Respons / catatan |
|---|---|---|
| GET | `/settings/public` | `LibrarySettings` (`institutionName`, `address`, `openingHours`, `logoUrl`, `timezone`) |
| GET | `/opac/home` | `{ library, stats, newest: BookSummary[], popularThisMonth, subjects, loanRules }` |
| GET | `/search` | query `q, subject[], language[], yearFrom, yearTo, available, sort=relevance\|newest\|title\|popular, page, pageSize` → `SearchResponse` = `{ items: SearchResult[], total, tookMs, semanticAvailable, page, pageSize, totalPages }`. `semantic: true` = hasil (juga) dari AI |
| GET | `/books` | query `q, subjectId, subject, sort, page, pageSize` → page `BookSummary` |
| GET | `/books/:id` | `Book` (+ `items: Item[]`) |
| GET | `/books/:id/similar` | `BookSummary[]` |
| GET | `/master-data/:kind` | `kind` = `authors\|publishers\|subjects\|shelf-locations`, query `q, limit` → `{ id, name, code? }[]` |
| GET | `/holidays?year=` | `Holiday[]` |

`BookSummary` = `{ id, title, subtitle, authors, year, callNumber, coverUrl, availability: { total, available, shelves, holdQueue } }`, plus `publisher, subjects, language, synopsis, cover: { small, large }`. `coverUrl: null` → tampilkan placeholder tipografis.

### Katalog & eksemplar (staf)
| Method | Path | Catatan |
|---|---|---|
| GET | `/books/isbn/:isbn/lookup` | `BookDraft` + `found`, `existingBookId`, `subjects` (Open Library, timeout 3 dtk) |
| POST/PATCH | `/books`, `/books/:id` | `authors`, `subjects`: array `{ id?, name }` atau string; `publisher`: `{ id?, name } \| null`. Master data yang belum ada dibuat otomatis → `Book` |
| DELETE | `/books/:id` | soft delete; bila masih ada pinjaman → `409 BOOK_HAS_ACTIVE_LOANS` |
| POST | `/books/:id/cover` | multipart `file` (JPEG/PNG/WebP ≤ 2 MB) → `{ coverUrl, cover }` |
| GET/POST | `/books/:id/items` | POST body `{ count, shelfLocationId (wajib), source, price, condition: GOOD\|FAIR\|POOR, barcodes? }` → `Item[]` |
| PATCH | `/items/:id` | → `Item`. Perubahan status manual yang tidak valid → `422 INVALID_STATUS_TRANSITION` |
| GET | `/items/lookup?barcode=` | `ItemWithBook` (+ `activeLoan`, `readyHold`), dipakai precheck setiap scan |
| GET | `/items/labels?ids=a,b` | **PDF** A4 berisi label Code128 (`label-barcode.pdf`) |
| POST/PATCH/DELETE | `/master-data/:kind[/:id]` | `shelf-locations`: `{ code, name }`; jenis lain: `{ name }`. Data yang masih dipakai → `409 IN_USE` |

### Anggota & staf
| Method | Path | Akses | Catatan |
|---|---|---|---|
| GET | `/members` | S | query `q, type, status, classOrMajor` → page `Member` |
| GET | `/members/lookup?code=` | S | `MemberSummary` datar: `activeLoans, maxActiveLoans, readyHolds, unpaidFines, blockingFineThreshold, loanDays, overdueLoans, activeHolds` |
| GET/PATCH | `/members/:id` | S | `MemberSummary` / `Member` |
| GET | `/members/:id/loans` | S | `Loan[]` aktif |
| POST | `/members` | S | → `Member & { temporaryPassword }` (tampilkan sekali) |
| POST | `/members/:id/reset-password` | S | → `{ temporaryPassword }` |
| POST | `/members/import?dryRun=true` | S | multipart `file` CSV → `{ total, valid, created: number, failed: [{ row, idNumber, errors }], accounts: [...temporaryPassword] }` |
| GET | `/staff` | A | `StaffUser[]` |
| POST | `/staff` | A | → `StaffUser & { temporaryPassword }` |
| PATCH | `/staff/:id`, POST `/staff/:id/reset-password` | A | |

### Sirkulasi, denda, reservasi
| Method | Path | Akses | Respons / catatan |
|---|---|---|---|
| POST | `/circulation/checkout` | S | body `{ memberCode, barcodes[] }` → `CheckoutResult` = `{ loans: Loan[], rejected: [{ barcode, reasons: string[] }] }`. Eksemplar yang lolos tetap dipinjam. Blokir di level anggota (status, denda) → `422 CHECKOUT_REJECTED` |
| POST | `/circulation/checkout/preview` | S | validasi tanpa menyimpan (opsional) |
| POST | `/circulation/checkin` | S | body `{ barcode }` → `CheckinResult` = `{ loan, member, fine, heldFor: { id, expiresAt, memberName, classOrMajor, ... } \| null, returnToShelf, itemStatus, fineDays }`. Bila eksemplar tidak sedang dipinjam → `409 NO_ACTIVE_LOAN` |
| POST | `/loans/:id/renew` | S, M (pinjaman sendiri) | → `Loan`. Bila ditolak → `422 RENEW_REJECTED` (`details` = alasan) |
| POST | `/loans/:id/mark-lost` | S | body `{ type: LOST\|DAMAGED, amount, note? }` → `Fine \| null` |
| POST | `/loans/:id/remind` | S | kirim ulang email keterlambatan |
| GET | `/loans` | S | query `status=active\|overdue\|returned, memberId, q` |
| GET | `/fines` | S | query `q, status, type, memberId` → page `Fine` (+ `outstanding`) |
| POST | `/fines/:id/payments` | S | body `{ amount }` (boleh sebagian) → `FinePayment` + `fine`. Melebihi sisa → `422 AMOUNT_EXCEEDS` |
| POST | `/fines/:id/waive` | A | body `{ reason }` → `Fine` |
| POST | `/holds` | M, S | body `{ bookId }` (staf menambah `memberId`) → `Hold` |
| DELETE | `/holds/:id` | M (reservasi sendiri), S | |
| GET | `/holds` | S | query `status, q, bookId, page` → page `Hold` (+ `member`). `?status=READY` = rak siap diambil |
| GET | `/books/:id/holds` | S | antrean per judul |

`Loan` = `{ id, item: ItemWithBook, memberId, checkedOutAt, dueAt, returnedAt, renewCount, maxRenewals, accruedFine }`.

### Portal anggota (MEMBER)
| Method | Path | Respons |
|---|---|---|
| GET | `/me/loans` | `Loan[]` + `overdue`, `canRenew`, `renewBlockedReasons` |
| GET | `/me/holds` | `Hold[]` |
| GET | `/me/fines` | `Fine[]` |
| GET | `/me/history` | page `Loan` |
| GET | `/me/recommendations` | `BookSummary[]` (AI; fallback ke koleksi populer/terbaru) |
| GET | `/me/notifications` | `Notification[]` = `{ id, type, title, body, readAt, createdAt }` (50 terbaru) |
| GET | `/me/notifications/unread-count` | `{ count }` |
| POST | `/notifications/:id/read`, `/notifications/read-all` | |
| PATCH | `/me/settings` | body `{ emailReminders }` → `Member` |
| GET | `/me/summary`, `/me/card` | ringkasan beranda; kartu digital (`qrPayload` = kode anggota) |

### Laporan & admin
| Method | Path | Akses | Respons / catatan |
|---|---|---|---|
| GET | `/reports/dashboard` | S | `DashboardKpis` datar (`loansToday, returnsToday, overdueActive, holdsReady, unpaidFinesTotal, unpaidFinesToday`) + `deltas, overdue, ready, checkouts14d, popularThisMonth, activity` |
| GET | `/reports/:type` | S | `type` = `circulation, popular, dead-stock, active-members, by-class, fines, lost-damaged`; query `from, to` (YYYY-MM-DD) → `{ title, columns, rows }` |
| GET | `/reports/:type/export?format=xlsx\|csv` | S | unduhan file; tercatat di audit log |
| GET | `/policies` | S | `LoanPolicy[]` |
| PUT | `/policies/:memberType` | A | |
| POST/DELETE | `/holidays[/:id]` | A | |
| GET/PATCH | `/settings` | A | `LibrarySettings` (+ `historyRetentionYears`) |
| POST | `/settings/logo` | A | |
| GET | `/audit-logs` | A | page `AuditLog` dengan `actor: { id, name }` |
| POST | `/ai/reindex` | A | → `AiIndexStatus`. Tanpa key → `409 AI_DISABLED` |
| GET | `/ai/status` | A | `AiIndexStatus` = `{ embedded, total, model, reindexing, progress }` |
| GET | `/health` | P | `{ status, db, redis }` |

## `errorCode`

`VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, DUPLICATE, IN_USE, TOO_MANY_REQUESTS, INTERNAL_ERROR, CSRF_INVALID, PASSWORD_CHANGE_REQUIRED, INVALID_CREDENTIALS, LOGIN_LOCKED, REFRESH_INVALID, ACCOUNT_DISABLED, WRONG_PASSWORD, CHECKOUT_REJECTED, NO_ACTIVE_LOAN, ALREADY_RETURNED, RENEW_REJECTED, LOAN_CLOSED, AMOUNT_EXCEEDS, FINE_CLOSED, FINE_CHANGED, ITEMS_AVAILABLE, NO_ITEMS, ALREADY_HELD, ALREADY_BORROWED, HOLD_LIMIT, MEMBER_NOT_ACTIVE, HOLD_NOT_ACTIVE, BOOK_HAS_ACTIVE_LOANS, BARCODE_TAKEN, INVALID_STATUS_TRANSITION, ITEM_CHANGED, INVALID_FILE, FILE_TOO_LARGE, FILE_REQUIRED, ISBN_INVALID, CSV_INVALID, AI_DISABLED, REINDEX_RUNNING`.
