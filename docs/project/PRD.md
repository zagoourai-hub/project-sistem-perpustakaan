# Epic PRD — Sistem Perpustakaan Sekolah/Kampus (working title: **Pustaka**)

> **Level:** Epic
> **Path:** `/docs/ways-of-work/plan/library-system/epic.md`
> **Owner:** bigboss (Zagoour)
> **Status:** Draft v1 — 28 Sep 2026
> **Target build:** AI coding agent (Claude Code / Codex CLI / Antigravity CLI), phase-by-phase dari Task List di bagian 10.

---

## 0. Ringkasan Keputusan Discovery

| Item | Keputusan |
|---|---|
| Target user | Satu institusi (sekolah atau kampus). Anggota = siswa/mahasiswa + guru/dosen/staf |
| Business model | Single-tenant, di-deploy per institusi (self-hosted, Docker + Coolify). Bukan SaaS multi-tenant |
| MVP scope | Katalog + sirkulasi, portal anggota (OPAC + reservasi + riwayat), barcode/QR scan, laporan + notifikasi, AI search & rekomendasi |
| Level PRD | Epic |
| Folder | `frontend/` + `backend/` + `docker/` (AI jadi module `ai` di NestJS — hanya memanggil API, tanpa model sendiri) |
| Arah visual | **Editorial / literary** — modern, bukan AI slop (lihat §9) |

---

## 1. Epic Name

**Pustaka — Sistem Manajemen Perpustakaan Institusi dengan Sirkulasi Berbasis Scan dan Pencarian Semantik**

---

## 2. Goal

### Problem
Mayoritas perpustakaan sekolah dan kampus kecil di Indonesia masih mencatat peminjaman di buku besar, spreadsheet, atau software lama yang UI-nya sulit dipakai dan tidak bisa diakses anggota dari HP. Akibatnya pustakawan menghabiskan waktu untuk pencatatan manual, denda sering tidak tercatat, dan buku terlambat kembali tanpa pengingat. Di sisi anggota, mencari buku berarti datang langsung ke rak atau bertanya ke petugas, dan pencarian hanya cocok kata-per-kata sehingga buku relevan sering tidak ketemu. Pimpinan institusi juga tidak punya data pemakaian koleksi untuk dasar pengadaan buku.

### Solution
Web app terpadu dengan tiga permukaan:
1. **Staff console** (pustakawan & admin) — kelola katalog dan eksemplar, sirkulasi pinjam/kembali/perpanjang lewat scan barcode/QR dari kamera atau USB scanner, kelola anggota, denda, dan laporan.
2. **Portal anggota** — OPAC (katalog publik) dengan pencarian hybrid (kata kunci + semantik), reservasi buku, riwayat pinjam, status denda, dan kartu anggota digital ber-QR.
3. **Module AI (di backend)** — embedding katalog untuk pencarian semantik ("buku tentang perubahan iklim untuk SMA"), buku serupa, dan rekomendasi personal berdasarkan riwayat pinjam.

### Impact
- Waktu layanan per transaksi sirkulasi turun dari ±2 menit (manual) ke < 15 detik.
- Tingkat keterlambatan pengembalian turun lewat reminder email otomatis.
- 100% denda tercatat dan bisa diaudit.
- Anggota menemukan buku tanpa harus ke meja petugas; pemakaian koleksi naik.
- Pimpinan punya dashboard sirkulasi dan koleksi populer/tidak terpakai sebagai dasar pengadaan.

---

## 3. User Personas

| Persona | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Admin Perpustakaan** (Kepala Perpustakaan / IT sekolah) | 1–2 orang. Setup sistem, kelola akun staf, atur kebijakan pinjam | Konfigurasi kebijakan, manajemen user, laporan untuk pimpinan |
| **Pustakawan** | 1–5 orang di meja layanan. Sering multitasking, antrean anggota | Sirkulasi cepat via scan, input katalog cepat (ISBN lookup), cari anggota cepat |
| **Anggota — Siswa/Mahasiswa** | Mayoritas user. Akses dari HP. Sebagian di bawah 18 tahun | Cari buku, cek ketersediaan, reservasi, tahu kapan jatuh tempo |
| **Anggota — Guru/Dosen/Staf** | Kuota pinjam lebih besar, durasi lebih lama | Sama dengan siswa + kebijakan pinjam berbeda |
| **Pengunjung publik (guest)** | Belum login | Menelusuri OPAC read-only |

---

## 4. High-Level User Journeys

### J1 — Pustakawan menambah buku baru
Scan/ketik ISBN → sistem ambil metadata dari Open Library → pustakawan koreksi & tambah klasifikasi DDC + nomor panggil → simpan judul → generate N eksemplar dengan barcode otomatis → cetak label barcode → buku masuk rak. Di background, module AI membuat embedding judul tersebut.

### J2 — Peminjaman di meja layanan
Anggota tunjukkan kartu (fisik atau QR di portal) → pustakawan scan kartu → panel anggota tampil (pinjaman aktif, denda, status) → scan barcode eksemplar satu per satu → sistem validasi kebijakan → konfirmasi → struk/bukti tampil + email konfirmasi.

### J3 — Pengembalian
Scan barcode eksemplar → sistem hitung keterlambatan & denda otomatis → kalau ada antrean reservasi, eksemplar ditandai "disimpan untuk reservasi" dan anggota berikutnya dinotifikasi → kalau tidak, eksemplar kembali "tersedia".

### J4 — Anggota mencari dan mereservasi buku
Buka portal di HP → ketik "novel tentang persahabatan remaja" → hasil hybrid (kata kunci + semantik) → buka detail buku → lihat ketersediaan per eksemplar → semua dipinjam → klik "Reservasi" → masuk antrean → notifikasi email saat buku siap diambil.

### J5 — Reminder dan denda
Job harian: H-2 jatuh tempo → email reminder; lewat jatuh tempo → email keterlambatan; denda terakumulasi harian sampai batas maksimum. Anggota bayar di meja → pustakawan tandai lunas (atau admin waive dengan alasan).

### J6 — Laporan bulanan
Admin buka dashboard → lihat statistik sirkulasi, koleksi terpopuler, anggota teraktif, buku tidak pernah dipinjam, denda terkumpul → export XLSX/CSV untuk rapat pimpinan.

---

## 5. Business Requirements

### 5.1 Functional Requirements

#### A. Autentikasi & Otorisasi
- FR-A1: Login dengan email/nomor induk + password. Tidak ada self-registration publik; akun anggota dibuat staf atau via import CSV.
- FR-A2: Custom JWT (access token 15 menit + refresh token 7 hari dengan rotasi), keduanya di httpOnly cookie. Refresh token disimpan hashed di DB dan bisa di-revoke.
- FR-A3: RBAC tiga role: `ADMIN`, `LIBRARIAN`, `MEMBER`. Guard di backend per endpoint; `proxy.ts` di frontend hanya untuk gating route (bukan sumber kebenaran otorisasi).
- FR-A4: Wajib ganti password saat login pertama untuk akun hasil import.
- FR-A5: Reset password oleh staf (generate password sementara). Reset mandiri via email = out of scope MVP.
- FR-A6: Rate limit login (5 percobaan / 15 menit per akun+IP).

#### B. Katalog
- FR-B1: CRUD **judul** (bibliographic record): judul, subjudul, pengarang (multi), penerbit, tahun, ISBN-10/13, bahasa, jumlah halaman, klasifikasi DDC, nomor panggil, subjek/kategori (multi), sinopsis, cover.
- FR-B2: Lookup metadata via ISBN ke Open Library API; hasil jadi prefill yang bisa diedit, tidak disimpan otomatis.
- FR-B3: CRUD **eksemplar** (item) per judul: barcode unik (auto-generate format `PST-{YYYY}-{seq6}` atau input manual untuk migrasi), lokasi rak, kondisi, sumber (beli/hibah), harga, tanggal masuk, status.
- FR-B4: Status eksemplar: `AVAILABLE`, `ON_LOAN`, `ON_HOLD` (disimpan untuk reservasi), `LOST`, `DAMAGED`, `IN_REPAIR`, `WITHDRAWN`. Transisi status hanya lewat aksi yang valid (state machine di service layer).
- FR-B5: Upload cover (JPEG/PNG/WebP, maks 2 MB), disimpan di object storage S3-compatible (MinIO self-hosted), di-resize ke 2 ukuran.
- FR-B6: Master data: pengarang, penerbit, subjek, lokasi rak.
- FR-B7: Cetak label barcode (batch) sebagai halaman print-ready (A4, grid label) dengan barcode Code128 + nomor panggil.
- FR-B8: Soft delete judul/eksemplar; judul dengan eksemplar yang sedang dipinjam tidak bisa dihapus.

#### C. Keanggotaan
- FR-C1: CRUD anggota: nama, nomor induk (NIS/NIM/NIP), tipe (`STUDENT`, `STAFF`), kelas/prodi, email, no. HP (opsional), foto (opsional), tanggal berlaku keanggotaan.
- FR-C2: Import anggota massal via CSV dengan validasi per baris + laporan baris gagal.
- FR-C3: Kartu anggota digital (QR berisi member code, bukan data pribadi) di portal + versi printable.
- FR-C4: Status anggota: `ACTIVE`, `SUSPENDED`, `EXPIRED`. Suspended/expired tidak bisa meminjam atau reservasi.
- FR-C5: Pencarian anggota cepat (nama, nomor induk, member code) untuk meja layanan.

#### D. Kebijakan Sirkulasi
- FR-D1: Kebijakan per tipe anggota: maks pinjaman aktif, durasi pinjam (hari), maks perpanjangan, denda per hari, batas maksimum denda per pinjaman, batas denda yang memblokir peminjaman, durasi simpan reservasi (hari), maks reservasi aktif.
- FR-D2: Hari libur/tutup perpustakaan: jatuh tempo yang jatuh di hari libur digeser ke hari buka berikutnya; hari libur tidak dihitung denda.

#### E. Sirkulasi
- FR-E1: **Checkout**: scan kartu anggota → scan satu atau lebih eksemplar → validasi → konfirmasi batch. Validasi: anggota aktif, belum melebihi kuota, denda belum melewati batas blokir, eksemplar `AVAILABLE` atau `ON_HOLD` untuk anggota yang sama.
- FR-E2: **Checkin**: scan eksemplar → tutup pinjaman → hitung denda → cek antrean reservasi → set status `ON_HOLD` atau `AVAILABLE`. Checkin tidak butuh scan kartu anggota.
- FR-E3: **Renew**: oleh pustakawan atau anggota dari portal. Ditolak jika sudah overdue, mencapai maks perpanjangan, atau judul punya antrean reservasi.
- FR-E4: Tandai eksemplar hilang/rusak dari pinjaman aktif → denda penggantian (default harga eksemplar, bisa diubah).
- FR-E5: Checkout/checkin aman dari race condition (dua pustakawan scan eksemplar yang sama bersamaan) — gunakan update bersyarat pada status di dalam transaksi.
- FR-E6: Setiap transaksi sirkulasi tercatat di audit log (siapa, kapan, apa).

#### F. Denda
- FR-F1: Denda keterlambatan dihitung saat checkin dan di-update harian oleh job untuk pinjaman yang masih overdue (supaya portal menampilkan angka berjalan).
- FR-F2: Status denda: `UNPAID`, `PAID`, `WAIVED`. Pembayaran dicatat manual (tunai di meja) dengan nominal & petugas. Pembayaran parsial didukung.
- FR-F3: Waive hanya oleh `ADMIN`, wajib alasan.

#### G. Reservasi (Hold)
- FR-G1: Anggota mereservasi **judul** (bukan eksemplar spesifik) hanya jika tidak ada eksemplar `AVAILABLE`.
- FR-G2: Antrean FIFO per judul. Saat eksemplar dikembalikan → anggota teratas mendapat status `READY` + email, eksemplar `ON_HOLD` selama N hari.
- FR-G3: Hold kedaluwarsa otomatis (job) → lanjut ke antrean berikutnya atau eksemplar jadi `AVAILABLE`.
- FR-G4: Anggota bisa membatalkan reservasi sendiri.
- FR-G5: Status: `WAITING`, `READY`, `FULFILLED`, `CANCELLED`, `EXPIRED`.

#### H. Barcode/QR Scan
- FR-H1: Scan via kamera perangkat (HP/laptop) dengan native `BarcodeDetector` API bila tersedia, fallback ke library ZXing.
- FR-H2: Dukungan USB/Bluetooth barcode scanner (HID keyboard wedge): input field sirkulasi selalu autofocus dan mendeteksi input cepat diakhiri Enter.
- FR-H3: Format: Code128 untuk eksemplar, QR untuk kartu anggota. Scan otomatis mengenali jenis kode dari prefix.
- FR-H4: Feedback scan: suara pendek + haptic (jika didukung) + toast, termasuk bunyi berbeda untuk error.

#### I. Portal Anggota & OPAC
- FR-I1: OPAC publik (tanpa login): pencarian, filter (subjek, tahun, bahasa, ketersediaan), detail buku dengan ketersediaan per eksemplar + lokasi rak.
- FR-I2: Pencarian hybrid: full-text Postgres + trigram (toleran typo) dikombinasikan dengan pencarian semantik dari AI service menggunakan Reciprocal Rank Fusion (RRF). Jika OpenRouter gagal/timeout, otomatis fallback ke full-text saja.
- FR-I3: Dashboard anggota: pinjaman aktif (dengan countdown jatuh tempo), reservasi, denda, riwayat pinjam (paginated).
- FR-I4: Perpanjang mandiri dan kelola reservasi dari portal.
- FR-I5: Rekomendasi "Untuk kamu" (berdasarkan riwayat) dan "Buku serupa" di halaman detail.
- FR-I6: Responsive mobile-first; portal bisa di-install sebagai PWA (manifest + ikon, tanpa offline mode).

#### J. Notifikasi
- FR-J1: Email transaksional via SMTP: konfirmasi pinjam, reminder H-2, overdue (hari ke-1, 3, 7), reservasi siap, reservasi kedaluwarsa.
- FR-J2: Semua email dikirim lewat antrean BullMQ dengan retry; log status pengiriman.
- FR-J3: Notifikasi in-app sederhana (lonceng) di portal untuk event yang sama.
- FR-J4: Anggota bisa mematikan email reminder (bukan email transaksional wajib).

#### K. Laporan
- FR-K1: Dashboard staf: pinjaman hari ini, pengembalian hari ini, overdue aktif, reservasi siap diambil, denda belum lunas.
- FR-K2: Laporan: sirkulasi per periode, koleksi terpopuler, koleksi tidak pernah dipinjam (dead stock), anggota teraktif, per kelas/prodi, denda terkumpul, eksemplar hilang/rusak.
- FR-K3: Export XLSX dan CSV untuk setiap laporan.
- FR-K4: Filter periode (harian/bulanan/custom range).

#### L. AI (module `ai` di backend NestJS)
- FR-L1: Embedding setiap judul dari gabungan: judul, subjudul, pengarang, subjek, sinopsis. Re-embed hanya jika hash konten berubah.
- FR-L2: Pencarian semantik (top-K kandidat + skor) dijalankan di backend; frontend tidak pernah memanggil OpenRouter langsung.
- FR-L3: "Buku serupa": nearest neighbor dari embedding judul.
- FR-L4: "Untuk kamu": centroid embedding dari N pinjaman terakhir anggota, exclude buku yang sudah pernah dipinjam.
- FR-L5: Backfill embedding seluruh katalog via job admin (dengan progress).
- FR-L6: Model embedding dikonfigurasi via env (default `openai/text-embedding-3-small` via OpenRouter); perubahan model memicu re-embed penuh.

#### M. Administrasi
- FR-M1: Kelola akun staf (ADMIN/LIBRARIAN).
- FR-M2: Profil perpustakaan: nama institusi, logo, alamat, jam buka, email pengirim.
- FR-M3: Audit log dapat dicari (aktor, aksi, entitas, rentang tanggal).

### 5.2 Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Performance** | Scan → hasil validasi < 500 ms (p95). OPAC full-text < 300 ms (p95). Hybrid search < 1,5 detik (p95), dengan timeout AI 800 ms lalu fallback. LCP portal < 2,5 detik di 4G |
| **Skala** | Target 50.000 judul, 150.000 eksemplar, 10.000 anggota, 50 concurrent staff+member tanpa degradasi |
| **Security** | OWASP ASVS L2 baseline. Password Argon2id. httpOnly + Secure + SameSite=Lax cookie. CSRF protection untuk mutasi. Helmet + CORS whitelist. Validasi input via Zod (Standard Schema). Rate limit global + login. OpenRouter API key hanya di env backend, tidak pernah ke browser |
| **Privasi (UU PDP No. 27/2022)** | Data minimization (anggota di bawah umur): hanya field yang diperlukan. QR kartu hanya berisi member code. Riwayat pinjam hanya bisa dilihat pemilik & staf. Export data pribadi tercatat di audit log. Kebijakan retensi: riwayat pinjam dianonimkan setelah anggota keluar + 2 tahun (job) |
| **Accessibility** | WCAG 2.2 AA: kontras ≥ 4.5:1, navigasi keyboard penuh di staff console, focus ring terlihat, `prefers-reduced-motion` dihormati |
| **Reliability** | Backup Postgres harian (pg_dump ke storage terpisah, retensi 30 hari). Job idempotent. Healthcheck di semua service |
| **Observability** | Structured logging (pino) dengan request id. Healthcheck `/health` tiap service |
| **Maintainability** | TypeScript strict, tanpa `any`. Vitest unit test untuk business rule sirkulasi (coverage ≥ 80% di modul circulation). Lint via oxlint |
| **Browser** | 2 versi terakhir Chrome, Edge, Firefox, Safari; Android Chrome & iOS Safari |
| **i18n** | UI Bahasa Indonesia. Format tanggal & Rupiah `id-ID`. Timezone default `Asia/Jakarta`, bisa diubah di pengaturan |

---

## 6. Success Metrics

| KPI | Target 3 bulan setelah go-live |
|---|---|
| Median durasi transaksi checkout (scan kartu → konfirmasi) | ≤ 15 detik |
| % transaksi sirkulasi tercatat di sistem (vs manual) | 100% |
| Tingkat keterlambatan pengembalian | Turun ≥ 30% dari baseline |
| Anggota aktif di portal (login ≥ 1× / bulan) | ≥ 40% anggota terdaftar |
| Search success rate (pencarian yang diikuti klik detail) | ≥ 60% |
| % klik hasil yang berasal dari kontribusi semantik | Dilacak sebagai baseline AI |
| Uptime | ≥ 99,5% jam operasional |
| Error rate API 5xx | < 0,5% |

---

## 7. Out of Scope (MVP)

- Multi-tenant / multi-perpustakaan / multi-cabang dalam satu instance
- Pembayaran denda online (payment gateway / QRIS)
- Self-checkout kiosk & RFID/gate security
- E-book / koleksi digital / repository skripsi
- Pengadaan (acquisition), anggaran, vendor, serial/majalah (subscription management)
- Standar MARC21 / Z39.50 / OAI-PMH / integrasi SLiMS dua arah (import CSV dasar tetap ada)
- Notifikasi WhatsApp / push notification / SMS
- Reset password mandiri via email, SSO (Google Workspace for Education), 2FA
- Chatbot pustakawan AI / RAG isi buku / ringkasan AI
- Offline mode PWA
- Aplikasi mobile native

---

## 8. Business Value

**High.** Menyelesaikan pekerjaan harian inti perpustakaan (sirkulasi, katalog, denda) yang saat ini manual, dengan dampak langsung ke efisiensi staf dan akuntabilitas denda. Pencarian semantik + rekomendasi jadi pembeda nyata dibanding software perpustakaan open-source yang umum dipakai sekolah di Indonesia. Single-tenant self-hosted cocok dijual sebagai paket instalasi + maintenance per institusi, dan fondasinya bisa dikembangkan ke multi-tenant SaaS di fase berikutnya.

---

## 9. Technical Appendix

### 9.1 Stack & Versi (diverifikasi 28 Sep 2026)

| Layer | Teknologi |
|---|---|
| Monorepo | pnpm workspace |
| Frontend | Next.js **16.3.x** (App Router, Turbopack, Cache Components, `proxy.ts`), React 19.2, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query v5, Zustand, React Hook Form + Zod 4, Motion, Sonner |
| Scan | Native `BarcodeDetector` + fallback `@zxing/browser`; generate barcode/QR via `bwip-js` |
| Backend | NestJS **12** (ESM-only, Node ≥ 22.12), Prisma 7 (`prisma-client`, `@prisma/adapter-pg`), PostgreSQL 17 + `pgvector` + `pg_trgm`, Redis 7, BullMQ, Nodemailer, ExcelJS, Pino, Vitest, oxlint |
| Validasi backend | Zod 4 via Standard Schema validation NestJS 12 (DTO = Zod schema + inferred type) |
| AI | Module `ai` di NestJS: `@openrouter/sdk` (embeddings) → simpan di pgvector via Prisma `$queryRaw`/`$executeRaw` + package `pgvector` untuk serialisasi |
| Storage | MinIO (S3-compatible) untuk cover & foto |
| DevOps | Docker, Docker Compose, Coolify (VPS), GitHub Actions |

> **Catatan versi:** Next.js punya security release terjadwal 30 Sep 2026 (16.3.7) — pin ke patch terbaru saat scaffold. NestJS 12 ESM-only → backend wajib `"type": "module"` + `moduleResolution: "nodenext"` (sejalan dengan Prisma 7 yang juga ESM-only). Jest di NestJS 12 butuh Node 24.9+, jadi pakai Vitest.

### 9.2 Struktur Folder

```
pustaka/
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (public)/            # OPAC: /, /katalog, /buku/[id]
│       │   ├── (auth)/              # /masuk, /ganti-password
│       │   ├── (portal)/akun/       # dashboard anggota
│       │   └── (staff)/staf/        # console pustakawan & admin
│       ├── components/ui/           # shadcn primitives (themed)
│       ├── components/editorial/    # komponen signature (DueSlip, IndexCard, CallNumber)
│       ├── features/<domain>/       # api/, components/, hooks/, schemas/
│       ├── lib/                     # api-client, query-client, format, scanner
│       ├── stores/                  # zustand
│       └── proxy.ts
├── backend/
│   ├── prisma/schema.prisma
│   ├── prisma.config.ts
│   ├── generated/prisma/
│   └── src/
│       ├── common/                  # guards, decorators, filters, interceptors
│       ├── infra/                   # prisma, redis, queue, mail, storage
│       └── modules/                 # auth, users, members, catalog, items,
│                                    # policies, circulation, fines, holds,
│                                    # notifications, reports, search, audit, settings
├── docker/
│   ├── frontend/Dockerfile
│   ├── backend/Dockerfile
│   └── docker-compose.yml
└── pnpm-workspace.yaml
```

### 9.3 Data Model (ringkas)

| Model | Field kunci |
|---|---|
| `User` | id, email, passwordHash, role, mustChangePassword, lastLoginAt |
| `RefreshToken` | id, userId, tokenHash, expiresAt, revokedAt, replacedById |
| `Member` | id, userId, memberCode (unik, untuk QR), idNumber (NIS/NIM/NIP), type, classOrMajor, phone?, photoKey?, status, validUntil, emailReminders |
| `LoanPolicy` | memberType (unik), maxActiveLoans, loanDays, maxRenewals, finePerDay, maxFinePerLoan, blockingFineThreshold, holdPickupDays, maxActiveHolds |
| `Holiday` | date (unik), name |
| `Book` | id, title, subtitle, isbn13?, isbn10?, publisherId, year, language, pages, ddc, callNumber, synopsis, coverKey, searchVector (tsvector, generated), deletedAt |
| `Author`, `BookAuthor` | many-to-many dengan urutan |
| `Subject`, `BookSubject` | many-to-many |
| `Publisher`, `ShelfLocation` | master data |
| `Item` | id, bookId, barcode (unik), shelfLocationId, status, condition, source, price, acquiredAt, deletedAt |
| `Loan` | id, itemId, memberId, checkedOutAt, dueAt, returnedAt?, renewCount, checkedOutById, checkedInById? |
| `Fine` | id, loanId, type (`OVERDUE`/`LOST`/`DAMAGED`), amount, paidAmount, status, waivedReason?, waivedById? |
| `FinePayment` | id, fineId, amount, receivedById, paidAt |
| `Hold` | id, bookId, memberId, status, queuedAt, readyAt?, expiresAt?, itemId? |
| `Notification` | id, memberId, type, channel, payload, status, sentAt, readAt |
| `AuditLog` | id, actorId, action, entityType, entityId, metadata (json), ip, createdAt |
| `Setting` | key (unik), value (json) |
| `BookEmbedding` | bookId (PK), embedding `Unsupported("vector(1536)")`, model, contentHash, updatedAt |

Index penting: partial unique index `Loan(itemId) WHERE returnedAt IS NULL` (satu pinjaman aktif per eksemplar), GIN pada `Book.searchVector`, GIN trigram pada `Book.title`, HNSW (`vector_cosine_ops`) pada `BookEmbedding.embedding`.

> **Risiko Prisma + pgvector:** index HNSW dan partial unique index dibuat lewat migrasi SQL custom (`prisma migrate dev --create-only`). `migrate dev` dikenal suka meng-generate `DROP INDEX` untuk index yang tidak dikenali schema — setiap migrasi baru wajib direview sebelum di-commit, dan production hanya pakai `prisma migrate deploy`.

### 9.4 API Surface (REST, prefix `/api/v1`)

| Modul | Endpoint utama |
|---|---|
| auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/change-password`, `GET /auth/me` |
| members | `GET/POST /members`, `GET/PATCH /members/:id`, `POST /members/import`, `GET /members/lookup?code=` |
| catalog | `GET/POST /books`, `GET/PATCH/DELETE /books/:id`, `GET /books/isbn/:isbn/lookup`, `POST /books/:id/cover` |
| items | `POST /books/:id/items`, `PATCH /items/:id`, `GET /items/lookup?barcode=`, `POST /items/labels` |
| circulation | `POST /circulation/checkout`, `POST /circulation/checkin`, `POST /loans/:id/renew`, `POST /loans/:id/mark-lost` |
| fines | `GET /fines`, `POST /fines/:id/payments`, `POST /fines/:id/waive` |
| holds | `POST /holds`, `DELETE /holds/:id`, `GET /books/:id/holds` |
| me (portal) | `GET /me/loans`, `GET /me/holds`, `GET /me/fines`, `GET /me/history`, `GET /me/recommendations`, `GET /me/notifications` |
| search | `GET /search?q=&filters=` (hybrid), `GET /books/:id/similar` |
| reports | `GET /reports/dashboard`, `GET /reports/:type`, `GET /reports/:type/export?format=xlsx|csv` |
| admin | `/policies`, `/holidays`, `/staff`, `/settings`, `/audit-logs`, `POST /ai/reindex` |

Module `ai` tidak mengekspos endpoint sendiri (kecuali admin `POST /ai/reindex` & `GET /ai/status`); dipakai langsung sebagai provider oleh modul `search`, `me`, dan `catalog`.

### 9.5 Design Direction — "Editorial, bukan AI slop"

**Konsep:** Perpustakaan sebagai benda cetak. Referensinya kartu katalog, slip tanggal kembali, halaman indeks buku, dan tata letak majalah sastra — diterjemahkan ke UI modern yang bersih, bukan skeuomorfik.

**Palet (token di `:root`, ada varian dark "ruang baca malam")**

> **Diganti:** token light mode sekarang mengikuti design system Stitch "Pustaka Editorial" dengan nama role Material (`surface` #FFF8F1, `surface-container-*`, `on-surface` #1D1B17, `on-surface-variant` #564240, `outline-variant` #DCC0BD, `primary` #5B0D0D, `primary-container` #7A2420, `secondary` #4A6546, ochre `tertiary-*`). Lihat `docs/design/DESIGN.md`. Tabel di bawah hanya berlaku untuk kolom **Dark**.

| Token | Light | Dark | Fungsi |
|---|---|---|---|
| `--paper` | `#F5F1E8` | `#16140F` | Background utama |
| `--paper-raised` | `#FBF8F2` | `#1E1B15` | Card/surface |
| `--ink` | `#1C1A16` | `#ECE6D8` | Teks utama |
| `--ink-muted` | `#5E584D` | `#A39B8B` | Teks sekunder |
| `--rule` | `#D9D1C1` | `#3A3429` | Garis pemisah (hairline) |
| `--oxblood` | `#7A2420` | `#D0685F` | Aksen tunggal: CTA, link aktif, overdue |
| `--moss` | `#3F5A3C` | `#8FB08A` | Status tersedia/sukses |
| `--ochre` | `#A66A12` | `#E0A948` | Warning/jatuh tempo dekat |

**Tipografi** (final, mengikuti `DESIGN.md` v2 hasil Stitch)
- Headline, judul halaman, masthead: **Anton** (weight 400 saja), minimal 20px. Judul buku memakai Anton hanya saat menjadi headline halaman (detail buku) dan di placeholder cover tipografis; di list/baris/kartu tetap Work Sans.
- UI, body, dan **judul buku**: **Work Sans** (judul buku semibold 600).
- Data (nomor panggil, barcode, tanggal, nominal, kicker): **IBM Plex Mono**, `font-variant-numeric: tabular-nums`.

**Elemen signature (maksimal 3, dipakai konsisten)**
1. **DueSlip** — pinjaman aktif di portal tampil seperti slip tanggal kembali: kolom tanggal ber-font mono, "stempel" tanggal jatuh tempo dengan rotasi ±2° dan warna ochre/oxblood saat mendekati/lewat jatuh tempo.
2. **IndexCard** — halaman detail buku memakai layout kartu katalog: nomor panggil di pojok kiri atas (mono), hairline horizontal, metadata tersusun seperti kartu.
3. **CallNumber chip** — nomor panggil selalu tampil dalam chip mono ber-border hairline, di semua list.

**Layout**
- Grid 12 kolom asimetris ala majalah di halaman publik (kolom sempit untuk metadata, kolom lebar untuk konten).
- Hairline rules (1px `--rule`) sebagai pemisah, bukan shadow tebal. Radius kecil (4px) dan konsisten.
- Staff console: padat informasi, tabel ber-zebra halus, keyboard-first (shortcut `/` cari, `F2` checkout, `F3` checkin).
- Cover buku jadi elemen visual utama; judul tanpa cover mendapat placeholder tipografis (judul + pengarang di atas warna solid dari hash judul), bukan ilustrasi generik.

**Motion (Motion library)**
- Durasi 150–250 ms, easing `cubic-bezier(0.2, 0, 0, 1)`. Hanya untuk: masuknya hasil scan ke daftar, stempel DueSlip, transisi panel. Nonaktif total saat `prefers-reduced-motion`.
- View Transitions (React 19.2) untuk navigasi list → detail buku.

**Larangan eksplisit (anti AI slop)**
- ❌ Gradien ungu/biru, mesh gradient, blob, glassmorphism, glow
- ❌ Emoji sebagai ikon; ikon 3D; ilustrasi orang generik
- ❌ Hero "Welcome to the future of libraries" + 3 feature card berikon
- ❌ Komponen efek "shiny"/"sparkle"/"beam"/animated border (termasuk dari Magic UI) — di proyek ini Magic UI tidak dipakai
- ❌ Shadow besar dan radius 16px+ di mana-mana
- ❌ Copywriting hype ("revolutionize", "seamless", "powered by AI ✨"). Fitur AI tampil diam-diam: label kecil "hasil semantik" di hasil pencarian, tanpa badge berkilau
- ❌ Inter / Poppins sebagai font utama
- ❌ Anton di bawah 20px atau untuk judul buku di list/baris/kartu
- ✅ Ikon: Lucide, stroke 1.5, ukuran konsisten 16/20

### 9.5.1 Referensi Visual (Stitch)

Sumber kebenaran visual untuk frontend:
- `docs/design/DESIGN.md` — token warna, tipografi, radius, spacing, komponen, do's & don'ts.
- `docs/design/image/` (PNG) dan `docs/design/screen/` (HTML + `tokens.css`) — hasil ekspor layar dari Google Stitch (project "Pustaka Design System Board"). Palet mengikuti design system Stitch "Pustaka Editorial" (role Material, lihat `DESIGN.md`).
- `docs/design/README.md` — panduan kemiripan: peta layar→route, anatomi tiap layar, bug mockup yang tidak boleh ditiru, konversi warna/ikon ke stack.

| File ekspor | Layar | Dipakai di task |
|---|---|---|
| `tokens.css` | Token shadcn light/dark | 3.1 |
| `03-komponen` | Komponen | 3.1, 3.2 |
| `04-dasbor` | Dasbor Konsol Staf | 10.2 |
| `05-sirkulasi-pinjam` | Sirkulasi — mode Pinjam | 6.4 |
| `06-sirkulasi-kembali` | Sirkulasi — mode Kembali | 6.4 |
| `07-portal-anggota` | Portal Anggota Beranda (mobile) | 8.4 |
| `08-kartu-digital` | Kartu Anggota Digital (mobile) | 8.4 |
| `09-opac-home` | Halaman Depan OPAC | 8.3 |
| `10-hasil-pencarian` | Hasil Pencarian | 8.3 |
| `11-detail-buku` | Detail Buku | 8.3 |
| `12-tambah-buku` | Katalog — Tambah Buku | 4.3 |

**Aturan untuk AI coding agent:** sebelum mengerjakan task `[FE]` yang membuat halaman atau komponen, baca `docs/design/DESIGN.md`, `docs/design/README.md`, dan file ekspor Stitch yang relevan di tabel ini. HTML dari Stitch adalah **referensi visual, bukan kode yang di-copy**: implementasi tetap memakai shadcn/ui yang di-theme, token Tailwind v4 dari `globals.css`, dan struktur folder PRD. Nama institusi di mockup ("SMA Nusantara") dan judul buku hanyalah data contoh.

### 9.6 Konvensi Scaffolding Backend (Nest CLI)

Semua module, service, controller, dan resource di `backend/` **wajib di-generate lewat Nest CLI**, jangan dibuat manual. Tujuannya supaya struktur file konsisten dan otomatis terdaftar di module parent. Jalankan dari folder `backend/`.

**Prisma module (infra):**
```bash
nest g module infra/prisma
nest g service infra/prisma --no-spec
```
Setelah generate: tandai `PrismaModule` sebagai `@Global()` dan export `PrismaService`.

**Resource per domain:**
```bash
nest g resource modules/<name> --no-spec
# Pilih: transport = REST API, generate CRUD entry points = Yes
```

Aturan setelah `nest g resource`:
- **Hapus folder `entities/`**, karena model data berasal dari Prisma (`generated/prisma`).
- **Ganti DTO class-validator** hasil generate dengan Zod schema + inferred type (Standard Schema, NestJS 12).
- Endpoint CRUD bawaan yang tidak dipakai dihapus, jangan dibiarkan jadi route kosong.
- File tambahan (processor, rules, calculator, sub-service) tetap dibuat dengan `nest g service modules/<name>/<file> --flat --no-spec` jika berupa provider, atau file biasa jika fungsi murni.

**Daftar resource:**

| Resource | Perintah |
|---|---|
| auth | `nest g resource modules/auth --no-spec` |
| users | `nest g resource modules/users --no-spec` |
| members | `nest g resource modules/members --no-spec` |
| catalog (books) | `nest g resource modules/catalog --no-spec` |
| items | `nest g resource modules/items --no-spec` |
| policies | `nest g resource modules/policies --no-spec` |
| circulation | `nest g resource modules/circulation --no-spec` |
| fines | `nest g resource modules/fines --no-spec` |
| holds | `nest g resource modules/holds --no-spec` |
| me | `nest g resource modules/me --no-spec` |
| search | `nest g resource modules/search --no-spec` |
| notifications | `nest g resource modules/notifications --no-spec` |
| reports | `nest g resource modules/reports --no-spec` |
| settings | `nest g resource modules/settings --no-spec` |
| audit | `nest g resource modules/audit --no-spec` |
| health | `nest g resource modules/health --no-spec` |

---

## 10. Task List

Task list dipindah ke tracker per area — update status di sana, bukan di PRD:

- `docs/tasks/backend.md` — `[BE]` + `[AI]` (NestJS, Prisma, module `ai`)
- `docs/tasks/frontend.md` — `[FE]` (Next.js)
- `docs/tasks/ops.md` — `[OPS]` (monorepo, Docker, CI, deploy)

Struktur tetap Phase → Feature Group → sub-task atomik. ID task (`BE-6.2.3`, `FE-8.3.1`, …) stabil dan dipakai untuk referensi di commit/PR. Task `[BE]` yang menyebut file resource dikerjakan di atas file hasil generate Feature Group 1.0, bukan dibuat dari nol.

---

## 11. Open Questions (butuh keputusan bigboss sebelum Phase terkait)

1. **Konfirmasi dialog:** default Zagoour pakai SweetAlert2, tapi styling-nya bentrok dengan tema editorial. Di PRD ini saya pakai shadcn `AlertDialog` yang di-theme. Oke, atau tetap SweetAlert2? *(Phase 6)*
2. **SMTP provider** untuk production (SMTP sekolah, Brevo, Amazon SES)? *(Phase 9)*
3. **Migrasi data awal:** apakah institusi target sudah punya data di software lain (mis. spreadsheet atau SLiMS)? Kalau ya, perlu task import katalog CSV terpisah. *(Phase 4)*
4. **Format nomor induk** anggota dan format barcode eksisting (kalau buku sudah pernah dilabel). *(Phase 2 & 4)*
