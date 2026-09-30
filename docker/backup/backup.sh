#!/bin/sh
# Backup Postgres harian (NFR Reliability): pg_dump format custom ke /backups,
# hapus file lebih tua dari BACKUP_RETENTION_DAYS. Jalan sebagai service `backup`
# di docker-compose.prod.yml; /backups sebaiknya bind mount ke disk/storage terpisah.
#
#   Sekali jalan (manual) : docker compose -f docker/docker-compose.prod.yml run --rm backup once
#   Restore               : pg_restore --clean --if-exists -d "$DATABASE_URL" /backups/pustaka-YYYYmmdd-HHMM.dump
set -eu

: "${PGHOST:=postgres}"
: "${BACKUP_DIR:=/backups}"
: "${BACKUP_RETENTION_DAYS:=30}"
: "${BACKUP_HOUR:=19}" # UTC → 02.00 WIB
export PGHOST

run_backup() {
  file="$BACKUP_DIR/pustaka-$(date -u +%Y%m%d-%H%M).dump"
  echo "[backup] $(date -u +%FT%TZ) → $file"
  pg_dump --format=custom --no-owner --file="$file.tmp" "$POSTGRES_DB"
  mv "$file.tmp" "$file"
  find "$BACKUP_DIR" -name 'pustaka-*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -print -delete
  echo "[backup] selesai ($(du -h "$file" | cut -f1))"
}

mkdir -p "$BACKUP_DIR"

if [ "${1:-}" = "once" ]; then
  run_backup
  exit 0
fi

# Loop harian tanpa cron: tidur sampai BACKUP_HOUR berikutnya.
while true; do
  now=$(date -u +%s)
  target=$(date -u -d "$(date -u +%F) ${BACKUP_HOUR}:00" +%s)
  [ "$target" -le "$now" ] && target=$((target + 86400))
  echo "[backup] berikutnya $(date -u -d "@$target" +%FT%TZ)"
  sleep $((target - now))
  run_backup || echo "[backup] GAGAL, dicoba lagi besok" >&2
done
