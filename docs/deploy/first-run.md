# Menjalankan pertama kali

Setelah stack production berjalan (lihat [coolify.md](coolify.md)).

> Nama menu mengikuti rencana konsol staf (`docs/tasks/frontend.md`). Bila halamannya belum tersedia, langkah yang sama bisa dilakukan lewat endpoint di [`docs/api/README.md`](../api/README.md).

## 1. Seed data dasar

```bash
docker compose -f docker/docker-compose.prod.yml run --rm backend seed
```

Seed bersifat idempoten (aman dijalankan ulang) dan membuat:

- akun **ADMIN** dari `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — wajib ganti password saat login pertama;
- **kebijakan pinjam** `STUDENT` (3 buku, 7 hari, denda Rp500/hari, maks Rp20.000, blokir ≥ Rp10.000) dan `STAFF` (10 buku, 30 hari);
- **profil perpustakaan** default.

## 2. Konfigurasi oleh admin

Login di `https://<domain>/masuk` dengan akun admin, ganti password, lalu:

1. **Pengaturan → Profil perpustakaan**: nama institusi, alamat, jam buka, email pengirim, logo, timezone.
2. **Pengaturan → Kebijakan pinjam**: sesuaikan kuota, durasi, denda per tipe anggota.
3. **Pengaturan → Hari libur**: isi hari libur/tutup tahun berjalan (jatuh tempo digeser, denda tidak dihitung).
4. **Pengaturan → Staf**: buat akun pustakawan (`LIBRARIAN`). Password sementara tampil sekali; berikan ke pemiliknya.

## 3. Master data & lokasi rak

**Katalog → Master data**: buat **lokasi rak** dulu (kode + nama, mis. `A-12` / `Fiksi Indonesia`) — wajib dipilih saat menambah eksemplar. Pengarang, penerbit, dan subjek dibuat otomatis saat input buku.

## 4. Import anggota (CSV)

**Anggota → Import CSV**. Kolom (baris pertama = header):

```csv
name,idNumber,type,classOrMajor,email,phone,validUntil
Budi Santoso,12345,SISWA,XI IPA 1,budi@sekolah.sch.id,,2027-06-30
Ibu Sari,198001012005012001,GURU,Bahasa Indonesia,sari@sekolah.sch.id,,2030-12-31
```

- `type`: `SISWA`/`MAHASISWA`/`STUDENT` atau `GURU`/`DOSEN`/`STAF`/`STAFF`.
- `validUntil`: `YYYY-MM-DD` (masa berlaku kartu).
- Jalankan dulu dengan **mode cek (dry run)** untuk melihat baris yang gagal, perbaiki, lalu import sungguhan.
- Hasil import menampilkan kode anggota (`AGT-YYYY-NNNNNN`) dan **password sementara** tiap akun — unduh/cetak dan bagikan; anggota wajib menggantinya saat login pertama. Anggota login dengan nomor induk atau kode anggota.

## 5. Katalog awal

Per judul: **Katalog → Tambah buku** → scan/ketik ISBN → *Cari Data* (prefill dari Open Library) → lengkapi DDC & nomor panggil → simpan → buat N eksemplar (barcode `PST-YYYY-NNNNNN` otomatis) → **cetak label** (PDF A4, grid 3×8) → tempel di punggung buku.

Buku yang sudah punya label lama: isi daftar barcode manual saat membuat eksemplar.

> Import katalog massal dari spreadsheet/SLiMS belum tersedia (PRD §11 no. 3).

## 6. Cek akhir

- `https://<domain>/api/v1/health` → `{"data":{"status":"ok","db":"up","redis":"up"}}`
- Coba satu siklus di meja sirkulasi: pinjam → kembali, dan pastikan email konfirmasi terkirim.
- Pastikan folder `BACKUP_PATH` terisi file `.dump` keesokan harinya.
