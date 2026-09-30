# syntax=docker/dockerfile:1
# Build dari root repo:  docker build -f docker/backend/Dockerfile -t pustaka-backend .

FROM node:24-slim AS base
RUN npm install -g pnpm@12.5.1 && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── build: semua dependency, generate Prisma client, compile Nest ──────────────
FROM base AS build
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-backend,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile
COPY backend/ ./
RUN pnpm prisma generate && pnpm build

# ── prod-deps: hanya dependency runtime (termasuk prisma CLI untuk migrate) ────
FROM base AS prod-deps
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-backend,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile --prod
# Engine migrate Prisma diunduh malas; lakukan saat build karena runtime berjalan non-root.
RUN ./node_modules/.bin/prisma version

# ── runtime ─────────────────────────────────────────────────────────────────────
FROM node:24-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# client Prisma (.ts) dipakai seed via tsx
COPY --from=build /app/src/generated ./src/generated
COPY backend/package.json backend/prisma.config.ts ./
COPY backend/prisma ./prisma
COPY docker/backend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
  && mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/v1/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["entrypoint.sh"]
