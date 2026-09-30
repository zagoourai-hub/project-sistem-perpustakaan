# Referensi UI/UX — Pustaka

Sumber: Google Stitch, project **"Pustaka Design System Board"** (`13154842218081821860`), diunduh 29 Sep 2026.
Profile acuan: design system Stitch **"Pustaka Editorial"** (`assets/7f056be8baf14a8bbf378d6df1a5a918`, v6) — palet, tipografi, radius, dan aturan di `DESIGN.md` diambil dari profile ini.
Target implementasi: **semirip mungkin** dengan mockup. Deviasi hanya boleh untuk (a) bug render mockup yang dicatat di bawah, (b) aturan `DESIGN.md` yang dilanggar mockup, atau (c) kebutuhan fungsional PRD yang tidak tergambar.

## Isi folder

| File | Isi |
|---|---|
| `DESIGN.md` | **Aturan desain final** sesuai profile: token warna (role Material), tipografi, komponen, do's & don'ts. Menang jika bertentangan dengan mockup. |
| `screen/tokens.css` | Token shadcn lama (palet paper/ink, HSL triplet). **Hanya dipakai untuk nilai dark mode**; light mode ikut profile. |
| `image/NN-*.png` | Screenshot resolusi penuh — **acuan visual utama** (komposisi, hierarki, proporsi). |
| `screen/NN-*.html` | Kode Stitch (Tailwind CDN v3). Dipakai untuk membaca **nilai persis**: ukuran font px, padding, lebar kolom, teks copy. Bukan untuk di-copy. |

> Catatan: layar "DESIGN.md" di Stitch masih v1 (Literata + IBM Plex Sans) dan tidak dipakai. Satu-satunya pengecualian terhadap profile: judul buku di halaman detail memakai Anton (keputusan owner).

## Peta layar → route → task PRD

| Ref | Layar | Route | Shell | Task |
|---|---|---|---|---|
| `03-komponen` | Sistem komponen | `components/ui/*`, `components/editorial/*` | — | 3.1, 3.2 |
| `04-dasbor` | Dasbor konsol staf | `(staff)/staf/page.tsx` | staf | 10.2 |
| `05-sirkulasi-pinjam` | Meja sirkulasi — Pinjam (F2) | `(staff)/staf/sirkulasi` | staf | 6.4 |
| `06-sirkulasi-kembali` | Meja sirkulasi — Kembali (F3) | `(staff)/staf/sirkulasi` (mode) | staf | 6.4 |
| `07-portal-anggota` | Portal anggota beranda (mobile) | `(portal)/akun/page.tsx` | portal | 8.4 |
| `08-kartu-digital` | Kartu anggota digital (mobile) | `(portal)/akun/kartu` | portal | 8.4 |
| `09-opac-home` | OPAC beranda | `(public)/page.tsx` | publik | 8.3 |
| `10-hasil-pencarian` | Hasil pencarian | `(public)/katalog` | publik | 8.3 |
| `11-detail-buku` | Detail buku | `(public)/buku/[id]` | publik | 8.3 |
| `12-tambah-buku` | Tambah buku | `(staff)/staf/katalog/baru` | staf | 4.3 |

Alur kerja per task `[FE]`: buka PNG → baca HTML untuk angka persis → cek `DESIGN.md` → implementasi dengan shadcn + token → bandingkan side-by-side dengan PNG (screenshot Playwright di lebar yang sama: desktop 1280px, mobile 390px).

## Tiga shell (layout bersama)

**Publik (09, 10, 11)** — header tipis: logo "PUSTAKA" Anton kiri (+ nama institusi muted setelah garis vertikal di 11), nav kanan `Katalog · Jam Buka · Bantuan` (aktif = oxblood + underline), tombol secondary `Masuk`, avatar bulat oxblood. Hairline di bawah header. Konten max 1200px. Footer diawali rule ink 2px: logo + nama institusi kiri, link kanan, baris copyright mono di bawah hairline.

**Konsol staf (04, 05, 06, 12)** — sidebar 232px `surface-container-high`: logo Anton + "KONSOL STAF" mono kecil; nav ikon+label (Dasbor, Sirkulasi, Katalog, Anggota, Reservasi, Denda, Laporan, Pengaturan), item aktif = bar oxblood 2px di kiri + teks semibold; blok user di bawah (nama semibold + role mono) + tombol logout. Top bar: search `Cari judul, barcode, atau anggota…` dengan kbd `/`, tanggal mono dengan ikon kalender, lonceng dengan badge angka oxblood, avatar. Page header: kicker mono → judul Anton besar → aksi di kanan → rule ink 2px. Footer halaman sirkulasi: "Pintasan Meja" dengan kbd + status terminal.

**Portal mobile (07, 08)** — header: logo Anton oxblood (+ "PORTAL" di 08), lonceng, avatar kotak radius 4px oxblood. Gutter 16px. Bottom nav 4 item ikon di atas label caps kecil: **Beranda, Pinjaman, Reservasi, Kartu** sesuai profile (aktif = `primary`). Mockup 07/08 menampilkan "Katalog" di posisi ke-2 — ikuti profile; katalog dijangkau dari tautan/pencarian.

## Catatan per layar

- **09 OPAC home** — kicker edisi ("EDISI SENIN, 28 SEPTEMBER 2026 · BUKA 07.00–15.30"), headline display Anton 2 baris "CARI BUKU, BUKAN RAK." kiri; kanan kolom statistik data-lg (angka ke-3 oxblood) dipisah hairline vertikal. Rule ink 2px. Search besar raised dengan tombol `Cari` oxblood; chip "Pencarian populer"; hint italic kecil kanan. "Baru di rak": 6 cover 2:3 + judul + pengarang + CallNumber + status dot. Dua kolom: "Paling dipinjam" (nomor 01–05 mono, thumbnail, "38× bulan ini") dan "Koleksi per subjek" (leader dotted ke angka mono). Tiga kolom info: Jam Buka, Aturan Pinjam, Lokasi.
- **10 Hasil pencarian** — search dengan tombol clear; header "38 JUDUL" Anton + query bold + waktu mono; select "Urutkan". Sidebar filter (checkbox oxblood, count mono kanan, range tahun + tombol Terapkan). Baris hasil: cover, judul semibold + CallNumber, meta, sinopsis 2 baris clamp, baris ketersediaan mono dengan dot + label `hasil semantik` muted; aksi kanan `Lihat` (secondary) atau `Reservasi` (sunken) bila semua dipinjam. Paginasi mono.
- **11 Detail buku** — breadcrumb mono + "Kembali ke hasil pencarian". Grid 3/9: **kolom kiri untuk cover 2:3** (kosong di mockup — bug), kanan IndexCard: CallNumber + DDC, judul buku **Anton** besar (diputuskan: judul buku sebagai headline halaman memakai Anton), pengarang + tahun, badge ketersediaan, grid metadata label caps mono/nilai, chip subjek, sinopsis. Tabel eksemplar (barcode chip, rak, kondisi, badge status, jatuh tempo kanan). "Buku serupa" 5 kolom.
- **05 Sirkulasi pinjam** — toggle segmen `Pinjam F2 | Kembali F3` (aktif = ink fill). Scan input 56px border ink 2px, ikon barcode kiri, kamera kanan; status line (dot moss "USB scanner siap…"). Kiri ≈40%: panel anggota (avatar inisial kotak, nama, kelas, badge Aktif, member code chip, masa berlaku), 3 statistik data-lg dipisah hairline (denda oxblood), notice denda dengan rule kiri ochre, daftar "Sedang dipinjam" (badge `Terlambat 8 hari` oxblood fill). Kanan: "ANTREAN SCAN (2)" — baris item (cover mini, judul, CallNumber, barcode, badge `Siap dipinjam` moss-container + tanggal kembali, tombol ×); baris ditolak = judul coret + alasan oxblood + "Hapus". Panel konfirmasi: `Batal Esc` secondary, `Konfirmasi Pinjam Enter` primary.
- **06 Sirkulasi kembali** — satu kolom daftar hasil kembali terbaru di atas (item terbaru: latar raised + rule kiri ink + "BARU SAJA"). Varian: kembali ke rak (ikon + "rak A-12"), simpan untuk reservasi (badge ochre outline + kotak antrean dengan rule kiri ochre + instruksi rak reservasi), terlambat (badge oxblood + "Denda: Rp8.000" + tombol "Terima pembayaran"). Header halaman + toggle mode hilang di mockup (bug) — pakai header yang sama dengan 05.
- **04 Dasbor** — header "DASBOR" + tombol `Pengembalian F3` secondary, `Buka Sirkulasi F2` primary. Baris KPI: di mockup hanya "Rp184.500 Denda belum lunas" (sisanya kosong — bug). **Implementasi 5 KPI FR-K1** (pinjaman hari ini, pengembalian hari ini, overdue aktif, reservasi siap, denda belum lunas) dalam gaya yang sama: data-lg + label semibold + delta mono kecil, dipisah hairline vertikal. Tabel "Terlambat" (badge hari oxblood fill, tombol `Ingatkan`), grid 3 kolom "Siap diambil" (badge `Disimpan` ochre outline, "Batas ambil" ochre bila hari ini), chart batang 14 hari (ink; hari tutup = rule pucat; hari ini oxblood + label), "Paling dipinjam bulan ini", panel "Aktivitas terakhir" `surface-container-high` dengan waktu mono.
- **07 Portal beranda** — tanggal kicker, "HALO, NADIA." Anton, ringkasan. Alert terlambat (rule kiri oxblood + link). DueSlip: judul, pengarang, CallNumber, hairline, tanggal pinjam mono + status (oxblood saat telat), **stempel** "JATUH TEMPO / 20 SEP 2026" border, rotasi −2°; tombol Perpanjang (disabled + alasan saat telat). Reservasi siap (badge `Siap diambil` ochre-container). "Untuk kamu" scroll horizontal. "Riwayat" kosong di mockup (bug) — isi 3 baris terakhir.
- **08 Kartu digital** — kartu raised: logo Anton oxblood + institusi, rule ink 2px, nama + kelas, QR besar, member code mono spaced, hairline, "Berlaku s/d" mono + badge Aktif. Hint kecerahan (ikon lampu, `surface-container-high`), tombol `Unduh kartu (PDF)` sunken.
- **12 Tambah buku** — breadcrumb, kicker, "TAMBAH BUKU", aksi `Batal`, `Simpan Draf`, `Simpan & Buat Eksemplar` primary. Langkah 1 kartu ISBN (input besar + ikon scan + `Cari Data`, pesan sukses moss). Langkah 2 grid 2 kolom form (label semibold + `*` oxblood, hint mono kanan, tag input dengan chip + "Tambah" dashed, counter sinopsis). Kolom kanan: sampul (dropzone dashed, Ganti/Hapus), "Eksemplar fisik" (jumlah, lokasi rak dengan state error oxblood, sumber, harga, kondisi), kotak "Barcode otomatis" mono, checkbox cetak label, shortcut `Ctrl+S` / `Esc`.
- **03 Komponen** — acuan state komponen: tombol (default/hover/fokus offset 2px/disabled/loading), input (standar/error/ikon), scan input (idle/sukses slide-in/error), badge, CallNumber, DueSlip 3 state, IndexCard mini, book row (termasuk placeholder tipografis), tabel pinjaman, toast (rule kiri moss/ochre/oxblood), empty state. **Font di file ini masih v1 (Literata/Plex Sans) — ganti ke Anton/Work Sans sesuai DESIGN.md.**

## Bug mockup — JANGAN ditiru

1. **Teks chip/kbd/badge patah baris**: "899.221 PRA / b", "F / 2", "Bata / l", "Siap / dipinjam", "Terapka / n", tag "Andrea / Hirata". Semua chip, kbd, badge, dan tombol pakai `whitespace-nowrap` dan lebar mengikuti isi.
2. **Area kosong**: KPI dasbor (04), header + kolom kanan (06), kolom cover + isi sinopsis (11), riwayat (07). Isi sesuai catatan di atas.
3. **Gambar cover berisi screenshot UI** (09, 11) — itu artefak generator; cover asli dari MinIO atau placeholder tipografis.
4. Label tanggal di top bar patah jadi 2 baris — satu baris.

## Konversi ke stack proyek

**Warna → token profile.** Layar 07–12 sudah memakai kelas role profile (`bg-surface-container-lowest`, `text-on-surface-variant`, `border-outline-variant`, …) — terjemahkan 1:1 ke token dengan nama yang sama. Layar 03–06 memakai hex lama; petakan begini:

| Hex di 03–06 | Token profile |
|---|---|
| `#F5F1E8` (latar konsol staf) | `surface-container` `#F3EDE6` |
| `#FAF7F2`, `#FBF8F2`, `#FFFFFF` (card/input) | `surface-container-lowest` |
| `#EDE7DA` (sidebar, panel sunken) | `surface-container-high` `#EDE7E0` |
| `#E5DFC2` | `surface-container-highest` |
| `#1C1A16` | `on-surface` |
| `#5E584D` | `on-surface-variant` |
| `#89726F`, `#8C8577`, `#B9AF9C` | `outline` |
| `#D9D1C1` | `outline-variant` |
| `#7A2420` | `primary-container` (badge terlambat, border error, angka denda) — tombol utama/nav aktif pakai `primary` |
| `#5B0D0D` | `primary` |
| `#3F5A3C` | `secondary` |
| `#A66A12`, `#C48226` | `on-tertiary-container` / `tertiary-container` (teks & border ochre) |

**Ikon**: mockup memakai Material Symbols → wajib **Lucide** stroke 1.5, 16/20px:
`dashboard→LayoutGrid`, `sync_alt→ArrowLeftRight`, `menu_book→BookOpen`, `badge→IdCard`, `bookmark/bookmark_border→Bookmark`, `payments→Banknote`, `bar_chart→BarChart3`, `settings→Settings`, `logout→LogOut`, `search→Search`, `notifications→Bell`, `account_circle/person→User`, `calendar_today→Calendar`, `barcode_scanner→ScanBarcode`, `photo_camera→Camera`, `close→X`, `arrow_forward→ArrowRight`, `arrow_back→ArrowLeft`, `expand_more→ChevronDown`, `check_circle→CircleCheck`, `error→CircleAlert`, `warning→TriangleAlert`, `move_to_inbox→Inbox`, `print→Printer`, `upload_file→FileUp`, `add→Plus`, `lightbulb→Lightbulb`, `cottage→House`, `local_library→Library`, `manage_search→SearchCheck`, `receipt_long→ReceiptText`, `progress_activity→LoaderCircle`, `bookmark_add→BookmarkPlus`, `event_available→CalendarCheck`, `share→Share2`, `refresh→RefreshCw`, `login→LogIn`, `playlist_add→ListPlus`.

**Tailwind/shadcn**: HTML memakai Tailwind v3 CDN + `tailwind.config`; proyek memakai Tailwind v4 CSS-first. Token masuk `frontend/app/globals.css` sebagai CSS variable (nilai hex/oklch penuh, bukan HSL triplet seperti di `tokens.css`) + `@theme inline`. Sudah diimplementasikan di `frontend/app/globals.css`: semua role profile jadi warna Tailwind dengan nama yang sama (`bg-surface-container-lowest`, `text-on-surface-variant`, …). Nama shadcn yang tidak bentrok dialiaskan (`background`→`surface`, `card`/`popover`→`surface-container-lowest`, `muted`→`surface-container`, `border`→`outline-variant`, `input`→`outline`, `ring`→`on-surface`, `sidebar`→`surface-container-high`). **`primary` dan `secondary` adalah role profile** (oxblood, moss) — komponen shadcn baru dari CLI wajib di-re-theme sebelum dipakai. Dark mode lewat kelas `.dark`. Font via `next/font/google` (Anton, Work Sans, IBM Plex Mono) — jangan `@import` Google Fonts. Kelas utilitas HTML seperti `text-[26px]`/`bg-[#EDE7DA]` diterjemahkan ke token/skala, bukan disalin mentah.

**Data contoh**: nama institusi ("SMA Nusantara", "SMA Negeri 3 Yogyakarta"), judul buku, nama anggota, dan angka hanyalah contoh — semua dari API/pengaturan.
