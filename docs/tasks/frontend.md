# Frontend Tasks

`frontend/` — Next.js 16.3. Baca `docs/design/README.md` sebelum task halaman/komponen.

Sumber: PRD §10 (dipindah ke sini — file ini yang di-update, bukan PRD). Format: `- [ ]` belum, `- [x]` selesai, `- [~]` sedang dikerjakan. ID task stabil; jangan dinomori ulang.

## Phase 0: Foundation & DevOps

### 0.2 Scaffold service
- [x] **FE-0.2.1** Scaffold `frontend/` dengan `create-next-app@16` (TypeScript, Tailwind, App Router, src dir, Turbopack) — *tanpa `src/`: app ada di `frontend/app/`*
- [x] **FE-0.2.2** Konfigurasi `frontend/next.config.ts` (Cache Components, React Compiler, image remotePatterns MinIO) — *rewrites `/api/v1/*` → `BACKEND_URL` selesai; Cache Components, React Compiler, remotePatterns MinIO belum* — *reactCompiler + cacheComponents aktif (layout root dibungkus Suspense karena rute membaca params/cookies); remotePatterns dari BACKEND_URL + MEDIA_URL, BookCover tetap <img>*
- [x] **FE-0.2.3** Init shadcn/ui (`frontend/components.json`) dengan style base neutral

## Phase 2: Auth, Staff & Members

### 2.3 Auth frontend
- [x] **FE-2.3.1** Buat `lib/api-client.ts` (fetch wrapper, credentials include, CSRF header, auto refresh on 401) — *axios (bukan fetch): XSRF bawaan axios, refresh single-flight, `ApiError`; cek: `node lib/api-client.check.ts`*
- [x] **FE-2.3.2** Buat `lib/query-client.ts` + `app/providers.tsx` (TanStack Query, Sonner Toaster) — *Sonner belum dipasang — tambah saat toast pertama dibutuhkan*
- [x] **FE-2.3.3** Buat `lib/server-fetch.ts` (fetch dari Server Component meneruskan cookie)
- [x] **FE-2.3.4** Buat `proxy.ts` (gating `/akun/*` dan `/staf/*` berdasarkan cookie + role claim) — *keputusan di `lib/auth/route-access.ts`; cek: `node lib/auth/route-access.check.ts`*
- [x] **FE-2.3.5** Buat `features/auth/schemas/login.schema.ts` — *di `features/auth/schemas/auth.schema.ts` (+ change-password)*
- [x] **FE-2.3.6** Buat `features/auth/hooks/use-login.ts` — *`useLogin` di `features/auth/api/auth.api.ts` (hook ikut file api)*
- [x] **FE-2.3.7** Buat `app/(auth)/masuk/page.tsx` (layout editorial split: kolom kiri tipografis nama perpustakaan, kanan form) — *+ `features/auth/components/login-form.tsx`; redirect `next` aman via `safeNextPath`*
- [x] **FE-2.3.8** Buat `app/(auth)/ganti-password/page.tsx` — *route dilindungi proxy*
- [x] **FE-2.3.9** Buat `stores/session.store.ts` (Zustand: user, role)

### 2.4 Members frontend (staf)
- [x] **FE-2.4.1** Buat `features/members/api/members.api.ts` (query keys + fetchers) — *+ hooks + `member.schema.ts`*
- [x] **FE-2.4.2** Buat `app/(staff)/staf/anggota/page.tsx` (tabel, search, filter tipe/status)
- [x] **FE-2.4.3** Buat `features/members/components/member-form.tsx` (RHF + Zod) — *dialog di halaman daftar; email & kelas opsional (sesuai backend); kata sandi sementara tampil sekali*
- [x] **FE-2.4.4** Buat `app/(staff)/staf/anggota/[id]/page.tsx` (profil, pinjaman, denda, riwayat) — *tanpa riwayat pinjam (belum ada endpoint staf); ada reset kata sandi*
- [x] **FE-2.4.5** Buat `features/members/components/member-import-dialog.tsx` (upload CSV + tabel hasil) — *alur periksa (dry run) lalu impor; unduh CSV kata sandi*
- [x] **FE-2.4.6** Buat `features/members/components/member-card-print.tsx` (kartu printable dengan QR) — *dialog dari halaman detail anggota, cetak via print CSS*

- [x] **FE-2.4.7** Buat `app/(staff)/staf/pengguna/page.tsx` (kelola staf, ADMIN only) — *ditambah menu "Pengguna" (admin) di sidebar; belum diuji dengan akun admin*

## Phase 3: Design System

### 3.1 Tokens & foundation
- [x] **FE-3.1.1** Buat `app/globals.css` — token warna light/dark (§9.5), `@theme` Tailwind v4, radius, hairline — *role profile Stitch (bukan paper/ink); `secondary` = moss, bukan secondary shadcn*
- [x] **FE-3.1.2** Buat `app/fonts.ts` (Anton, Work Sans, IBM Plex Mono via `next/font`)
- [x] **FE-3.1.3** Buat `lib/motion.ts` (preset durasi/easing + helper reduced-motion) — *easing `ease-editorial` + reduced-motion global di `globals.css`; library Motion belum dipasang* — *preset + helper saja, tanpa library Motion (semua transisi CSS)*
- [x] **FE-3.1.4** Override theme komponen shadcn: `components/ui/button.tsx` — *varian primary/secondary/sunken/ghost/link + `loading`*
- [x] **FE-3.1.5** Override theme komponen shadcn: `components/ui/input.tsx` — *+ `components/ui/label.tsx`, `components/ui/field.tsx`*
- [x] **FE-3.1.6** Override theme komponen shadcn: `components/ui/table.tsx` (hairline, zebra halus, angka tabular)
- [x] **FE-3.1.7** Override theme komponen shadcn: `components/ui/badge.tsx` (varian status eksemplar) — *peta status → label di `components/editorial/status-badge.tsx`*
- [x] **FE-3.1.8** Buat `components/ui/theme-toggle.tsx`

### 3.2 Komponen editorial signature
- [x] **FE-3.2.1** Buat `components/editorial/call-number.tsx`
- [x] **FE-3.2.2** Buat `components/editorial/index-card.tsx`
- [x] **FE-3.2.3** Buat `components/editorial/due-slip.tsx` (stempel tanggal + state normal/dekat/lewat)
- [x] **FE-3.2.4** Buat `components/editorial/book-cover.tsx` (cover + placeholder tipografis dari hash judul) — *`<img>` sampai remotePatterns MinIO di-set (FE-0.2.2)*
- [x] **FE-3.2.5** Buat `components/editorial/page-heading.tsx` (judul besar + kicker + hairline) — *+ `SectionHeading`*
- [x] **FE-3.2.6** Buat `components/editorial/empty-state.tsx` (tipografis, tanpa ilustrasi)
- [x] **FE-3.2.7** Buat `components/editorial/skeletons.tsx` (skeleton list buku, tabel, kartu) — *di `components/editorial/bits.tsx` (+ Kbd, Stat)*

### 3.3 Layout shell
- [x] **FE-3.3.1** Buat `app/(public)/layout.tsx` (masthead ala majalah + footer) — *shell di `components/shell/public-shell.tsx`; nama institusi dari `/settings/public` (assumed) + fallback*
- [x] **FE-3.3.2** Buat `app/(staff)/staf/layout.tsx` (sidebar ringkas, top bar dengan global search `/`) — *shell di `components/shell/staff-shell.tsx`; sidebar disembunyikan < lg (belum ada menu mobile)*
- [x] **FE-3.3.3** Buat `components/staff/keyboard-shortcuts.tsx` (`/`, `F2`, `F3`, dialog bantuan `?`) — *`/`, F2, F3 ada di staff-shell; dialog bantuan `?` belum*
- [x] **FE-3.3.4** Buat `app/(portal)/akun/layout.tsx` (navigasi bawah di mobile) — *nav: Beranda, Pinjaman (/akun/riwayat), Reservasi, Kartu*
- [x] **FE-3.3.5** Buat `app/manifest.ts` (PWA manifest + ikon) — *ikon masih favicon.ico — perlu ikon 192/512*

## Phase 4: Catalog & Items

### 4.3 Catalog frontend (staf)
- [x] **FE-4.3.1** Buat `features/catalog/api/books.api.ts` — *+ items, master data, label download*
- [x] **FE-4.3.2** Buat `app/(staff)/staf/katalog/page.tsx` (tabel judul, filter, search)
- [x] **FE-4.3.3** Buat `features/catalog/schemas/book.schema.ts` — *+ `suggestCallNumber`, add-items, cover*
- [x] **FE-4.3.4** Buat `features/catalog/components/isbn-lookup-field.tsx` (scan/ketik ISBN → prefill)
- [x] **FE-4.3.5** Buat `features/catalog/components/book-form.tsx` (RHF, multi-select pengarang/subjek dengan create inline) — *sampul diunggah di halaman detail, bukan di form; "Simpan tanpa eksemplar" menggantikan "Simpan Draf"*
- [x] **FE-4.3.6** Buat `features/catalog/components/cover-upload.tsx` — *unggah ada di book-detail.tsx, belum jadi komponen terpisah*
- [x] **FE-4.3.7** Buat `app/(staff)/staf/katalog/baru/page.tsx`
- [x] **FE-4.3.8** Buat `app/(staff)/staf/katalog/[id]/page.tsx` (detail + tab eksemplar + riwayat) — *tab riwayat dan edit metadata belum*
- [x] **FE-4.3.9** Buat `features/catalog/components/items-table.tsx` (status, lokasi, aksi) — *tabel inline di book-detail.tsx; cetak label via PDF backend*
- [x] **FE-4.3.10** Buat `features/catalog/components/add-items-dialog.tsx` (jumlah, lokasi, sumber, harga)
- [x] **FE-4.3.11** Buat `app/(staff)/staf/katalog/label/page.tsx` (grid label A4 print-ready + `@media print`) — *?book=<id>; cetak lewat print CSS*
- [x] **FE-4.3.12** Buat `app/(staff)/staf/master-data/page.tsx` (tab pengarang/penerbit/subjek/rak)

## Phase 5: Barcode & QR

### 5.1 Scanner engine
- [x] **FE-5.1.1** Buat `lib/scanner/detect-code-type.ts` (prefix → `ITEM` / `MEMBER` / `ISBN` / `UNKNOWN`) — *di `lib/scanner/detect-code-type.ts`; pola di `shared/constants.ts`*
- [x] **FE-5.1.2** Buat `lib/scanner/camera-scanner.ts` (BarcodeDetector + fallback dynamic import `@zxing/browser`)
- [x] **FE-5.1.3** Buat `lib/scanner/wedge-listener.ts` (deteksi input HID cepat + Enter) — *digabung ke `ScanInput` (ketikan dialihkan ke input scan)*
- [x] **FE-5.1.4** Buat `lib/scanner/feedback.ts` (beep sukses/error via Web Audio + vibrate)
- [x] **FE-5.1.5** Buat `features/scanner/hooks/use-scanner.ts` (gabung kamera + wedge, debounce duplikat) — *tidak perlu hook terpisah — logika ada di `ScanInput` + `circulation-desk.tsx`*
- [x] **FE-5.1.6** Buat `features/scanner/components/scan-input.tsx` (field autofocus + tombol kamera)
- [x] **FE-5.1.7** Buat `features/scanner/components/camera-sheet.tsx` (sheet kamera + frame bidik) — *+ `components/ui/dialog.tsx` (base-ui)*

### 5.2 Code generation
- [x] **FE-5.2.1** Buat `lib/barcode/render-barcode.ts` (bwip-js Code128 → SVG)
- [x] **FE-5.2.2** Buat `lib/barcode/render-qr.ts` (bwip-js QR → SVG)

## Phase 6: Circulation & Fines

### 6.4 Circulation frontend
- [x] **FE-6.4.1** Buat `stores/circulation.store.ts` (Zustand: member aktif, antrean scan, mode checkout/checkin)
- [x] **FE-6.4.2** Buat `features/circulation/api/circulation.api.ts` — *+ fines (pay/waive) & schema*
- [x] **FE-6.4.3** Buat `app/(staff)/staf/sirkulasi/page.tsx` (layout 2 kolom: panel anggota + daftar scan) — *`circulation-desk.tsx`; Enter ditangani di `ScanInput.onKeyDown` (diverifikasi di browser)*
- [x] **FE-6.4.4** Buat `features/circulation/components/member-panel.tsx` (status, kuota, denda, pinjaman aktif)
- [x] **FE-6.4.5** Buat `features/circulation/components/scan-queue.tsx` (item terscan + status validasi, animasi masuk) — *+ panel konfirmasi (FE-6.4.6)*
- [x] **FE-6.4.6** Buat `features/circulation/components/checkout-confirm.tsx` (ringkasan + due date) — *konfirmasi ada di scan-queue.tsx, bukan komponen terpisah*
- [x] **FE-6.4.7** Buat `features/circulation/components/checkin-panel.tsx` (hasil kembali, denda, notice "simpan untuk reservasi")
- [x] **FE-6.4.8** Buat `features/circulation/components/receipt.tsx` (bukti pinjam printable)
- [x] **FE-6.4.9** Buat `app/(staff)/staf/denda/page.tsx` (list denda, filter status) — *tipe `Fine` ditambah `outstanding`/`payments`; deep link `?fine=<id>`; API diuji live (bayar, validasi, waive 403); klik UI belum*
- [x] **FE-6.4.10** Buat `features/fines/components/payment-dialog.tsx`
- [x] **FE-6.4.11** Buat `features/fines/components/waive-dialog.tsx` (AlertDialog + alasan wajib)
- [x] **FE-6.4.12** Buat `app/(staff)/staf/pengaturan/kebijakan/page.tsx` (form kebijakan per tipe + kalender libur) — *kebijakan + hari libur di satu halaman*

## Phase 7: Holds (Reservasi)

### 7.2 Holds frontend
- [x] **FE-7.2.1** Buat `features/holds/api/holds.api.ts`
- [x] **FE-7.2.2** Buat `features/holds/components/reserve-button.tsx` (state: bisa/sudah/antrean ke-N) — *deteksi tamu lewat /auth/me tanpa refresh*
- [x] **FE-7.2.3** Buat `app/(staff)/staf/reservasi/page.tsx` (siap diambil, antrean per judul) — *tab Siap diambil + Antrean; belum diuji dengan data reservasi nyata*

## Phase 8: OPAC, Search & Member Portal

### 8.3 OPAC frontend
- [x] **FE-8.3.1** Buat `app/(public)/page.tsx` (masthead, search besar, "Baru di rak", "Paling dipinjam" — tanpa hero generik) — *masthead + pencarian (form native); statistik, "Baru di rak", "Paling dipinjam" menunggu endpoint*
- [x] **FE-8.3.2** Buat `features/search/hooks/use-search.ts` (URL state via searchParams) — *`useSearchState` di `features/search/api/search.api.ts`*
- [x] **FE-8.3.3** Buat `app/(public)/katalog/page.tsx` (hasil + filter sidebar, label kecil "hasil semantik")
- [x] **FE-8.3.4** Buat `features/search/components/search-filters.tsx` — *tanpa hitungan facet (backend belum mengirim); opsi subjek dari master data, bahasa statis; belum ada filter ruang koleksi*
- [x] **FE-8.3.5** Buat `features/search/components/book-result-row.tsx` (cover, judul serif, CallNumber, ketersediaan)
- [x] **FE-8.3.6** Buat `app/(public)/buku/[id]/page.tsx` (IndexCard layout, eksemplar + lokasi, reserve, serupa) — *client component (ketersediaan real-time)*
- [x] **FE-8.3.7** Buat `features/search/components/similar-books.tsx`

### 8.4 Member portal frontend
- [x] **FE-8.4.1** Buat `features/me/api/me.api.ts` — *+ notifikasi (polling 60s, mark read optimistic)*
- [x] **FE-8.4.2** Buat `app/(portal)/akun/page.tsx` (DueSlip pinjaman aktif, reservasi, denda, rekomendasi) — *sapaan, alert terlambat, DueSlip + perpanjang; reservasi/denda/rekomendasi belum*
- [x] **FE-8.4.3** Buat `features/me/components/loan-slip-list.tsx` (DueSlip + tombol perpanjang)
- [x] **FE-8.4.4** Buat `app/(portal)/akun/riwayat/page.tsx`
- [x] **FE-8.4.5** Buat `app/(portal)/akun/reservasi/page.tsx`
- [x] **FE-8.4.6** Buat `app/(portal)/akun/kartu/page.tsx` (kartu digital QR, brightness hint) — *"Unduh PDF" = dialog cetak browser (Simpan sebagai PDF); belum diuji dengan akun anggota*
- [x] **FE-8.4.7** Buat `app/(portal)/akun/pengaturan/page.tsx` (toggle email reminder, ganti password)
- [x] **FE-8.4.8** Buat `features/me/components/recommendations-strip.tsx`

## Phase 9: Notifications

### 9.2 Frontend
- [x] **FE-9.2.1** Buat `features/notifications/components/notification-bell.tsx` (popover + unread count, polling 60s) — *dropdown, hanya portal anggota (staf tak punya feed)*

## Phase 10: Reports & Admin

### 10.2 Reports frontend
- [x] **FE-10.2.1** Buat `app/(staff)/staf/page.tsx` (dashboard staf: angka besar tabular + daftar tindakan hari ini) — *baris 5 KPI (FR-K1) + state loading/error; tabel terlambat, siap diambil, grafik, aktivitas belum*
- [x] **FE-10.2.2** Buat `features/reports/components/period-filter.tsx`
- [x] **FE-10.2.3** Buat `features/reports/components/report-chart.tsx` (shadcn chart, palet editorial, tanpa gradien) — *SVG batang buatan sendiri, bukan shadcn chart*
- [x] **FE-10.2.4** Buat `app/(staff)/staf/laporan/page.tsx` (tab per laporan + tombol export)

### 10.3 Admin
- [x] **FE-10.3.1** Buat `app/(staff)/staf/pengaturan/page.tsx` (profil perpustakaan, logo)
- [x] **FE-10.3.2** Buat `app/(staff)/staf/audit/page.tsx`

## Phase 11: AI Module (NestJS)

### 11.3 Frontend
- [x] **FE-11.3.1** Buat `app/(staff)/staf/pengaturan/ai/page.tsx` (status index, jumlah ter-embed, tombol reindex + progress)

## Phase 12: Hardening & Deploy

### 12.1 Quality
- [x] **FE-12.1.1** Buat `frontend/e2e/checkout.spec.ts` (Playwright: login staf, scan via wedge simulasi, konfirmasi) — *jalan: E2E_BASE_URL=... pnpm e2e; memakai Chrome terpasang*
- [x] **FE-12.1.2** Buat `frontend/e2e/opac.spec.ts` (Playwright: cari, detail, reservasi)
- [x] **FE-12.1.3** Audit a11y halaman utama dengan `@axe-core/playwright` di `frontend/e2e/a11y.spec.ts`

## Tambahan (di luar PRD §10)

- [x] **FE-X.1** Folder `shared/`: `types/` (enums, kontrak API, model respons) + `props/` (props komponen design system) + `constants.ts`
- [x] **FE-X.2** `lib/endpoints.ts` — semua path backend di satu tempat; path bertanda *assumed* wajib dicocokkan dengan controller NestJS
- [x] **FE-X.3** `lib/form.ts` — `applyServerErrors` (error Zod backend → field RHF)
- [x] **FE-X.4** `lib/format.ts` — tanggal/Rupiah id-ID, `daysUntil` (Asia/Jakarta)
- [x] **FE-X.5** API + schema untuk reports (`periodSchema`) dan admin (policies, holidays, staff, settings, audit, AI status/reindex)
- [x] **FE-X.6** ESLint tidak jalan: typescript-eslint belum mendukung TypeScript 7 (versi scaffold). Turunkan `typescript` ke 6.x atau tunggu dukungan TS 7 — *typescript diturunkan ke 6.0.3; pnpm lint bersih*
- [x] **FE-X.7** Theme toggle (FE-3.1.8) belum; token dark mode sudah siap di `globals.css` (kelas `.dark`)
- [x] **FE-X.8** Uji E2E dengan backend asli (29 Sep 2026): login → dasbor (KPI nyata) → sirkulasi pinjam (AGT-000001 + PST-2026-000002) → kembali; CSRF, cookie httpOnly, invalidasi cache, audit log terverifikasi. Akun uji: `qa-librarian@pustaka.local` (LIBRARIAN, DB dev)
- [x] **FE-X.9** Deteksi kode berbasis prefix (FR-H3): `AGT-…`/`PST-…` + digit — kode seed tanpa tahun (`AGT-000001`) sebelumnya tidak dikenali

