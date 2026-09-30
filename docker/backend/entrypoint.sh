#!/bin/sh
# Terapkan migrasi lalu jalankan API. Production hanya memakai `migrate deploy`.
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "prisma migrate deploy"
  ./node_modules/.bin/prisma migrate deploy
fi

# `docker compose run backend seed` → seed admin, kebijakan pinjam, profil perpustakaan
if [ "$1" = "seed" ]; then
  exec node --import tsx prisma/seed.ts
fi

exec node dist/main.js
