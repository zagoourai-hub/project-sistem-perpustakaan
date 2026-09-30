# Deploy ke Coolify (VPS)

Satu institusi = satu deployment (single-tenant). Stack: `docker/docker-compose.prod.yml`.

| Service | Image | Dipublikasikan |
|---|---|---|
| `frontend` | `docker/frontend/Dockerfile` (Next standalone) | **ya**, port 3000 → domain |
| `backend` | `docker/backend/Dockerfile` (NestJS, migrasi otomatis) | tidak (hanya network internal + akses keluar) |
| `postgres` | `pgvector/pgvector:pg17` | tidak |
| `redis` | `redis:7-alpine` (AOF) | tidak |
| `backup` | `pgvector/pgvector:pg17` + `docker/backup/backup.sh` | tidak |

Browser hanya bicara ke frontend. `/api/v1/*` dan `/uploads/*` diteruskan Next ke backend (same-origin) sehingga cookie httpOnly tetap first-party dan CSRF double-submit sederhana.

## Spesifikasi minimum

2 vCPU, 4 GB RAM, 40 GB SSD (cukup untuk ±50.000 judul / 150.000 eksemplar). Build image frontend memakai RAM paling besar; bila VPS kecil, build di CI (`.github/workflows/docker.yml`) lalu tarik image dari GHCR.

## Langkah

1. **Resource baru** → *Docker Compose* → sumber Git repo ini, branch `main`.
   - *Base directory*: `/`
   - *Compose file*: `docker/docker-compose.prod.yml`
2. **Environment variables**: salin isi `.env.example` (root) ke tab *Environment Variables* Coolify, lalu isi minimal:
   - `PUBLIC_URL` = `https://perpustakaan.sekolah.sch.id` (tanpa garis miring di akhir)
   - `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET` (`openssl rand -base64 48`)
   - `SMTP_*`, `MAIL_FROM`
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
   - opsional `OPENROUTER_API_KEY` (pencarian semantik & rekomendasi)
   - `BACKUP_PATH` = path di server untuk file backup, sebaiknya disk/mount terpisah (mis. `/mnt/backup/pustaka`)
3. **Domain**: pada service `frontend` isi domain `https://perpustakaan.sekolah.sch.id`, port `3000`. Coolify (Traefik) mengurus sertifikat TLS. Jangan beri domain ke service lain.
4. **Healthcheck**: sudah ada di Dockerfile — backend `GET /api/v1/health` (cek DB + Redis), frontend `GET /`. Coolify menunggu `backend` sehat sebelum `frontend` naik.
5. **Deploy**. Container backend menjalankan `prisma migrate deploy` setiap start (`RUN_MIGRATIONS=true`, default).
6. Lanjut ke [first-run.md](first-run.md) untuk seed admin & data awal.

## Operasional

- **Update versi**: push ke `main` (atau tag `v*` bila memakai image GHCR) → *Redeploy*. Migrasi berjalan otomatis; hanya `migrate deploy` yang dipakai di production.
- **Log**: tab *Logs* per service. Backend memakai log JSON (pino) dengan `x-request-id`.
- **Backup**: service `backup` membuat `pustaka-YYYYmmdd-HHMM.dump` tiap hari pukul `BACKUP_HOUR` UTC (default 19 = 02.00 WIB), retensi `BACKUP_RETENTION_DAYS` (30). Backup manual: `docker compose -f docker/docker-compose.prod.yml run --rm backup once`.
- **Restore**:
  ```bash
  docker compose -f docker/docker-compose.prod.yml stop backend
  docker compose -f docker/docker-compose.prod.yml exec -T postgres \
    pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB" < /mnt/backup/pustaka/pustaka-20261001-1900.dump
  docker compose -f docker/docker-compose.prod.yml start backend
  ```
- **File upload** (cover, logo) ada di volume `uploads`. Ikutkan volume ini dalam backup server (snapshot VPS / rsync), atau pakai `STORAGE_DRIVER=s3` ke object storage eksternal.
- **Email**: cek status di tabel `Notification` (`SENT` / `FAILED` + kolom `error`). Worker mencoba ulang 3× dengan backoff.
- **AI**: setelah mengisi `OPENROUTER_API_KEY`, login admin → Pengaturan → Reindex AI (atau `POST /api/v1/ai/reindex`). Ganti `EMBEDDING_MODEL` = reindex penuh.
