# syntax=docker/dockerfile:1
# Build dari root repo:
#   docker build -f docker/frontend/Dockerfile --build-arg BACKEND_URL=http://backend:3001 -t pustaka-frontend .

FROM node:24-slim AS base
RUN npm install -g pnpm@12.5.1
WORKDIR /app

FROM base AS deps
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-frontend,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

FROM base AS build
# Rewrite /api/v1 & /uploads dikompilasi saat build → alamat backend di network Docker
ARG BACKEND_URL=http://backend:3001
ENV BACKEND_URL=$BACKEND_URL NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
RUN pnpm build

FROM node:24-slim AS runtime
WORKDIR /app
ARG BACKEND_URL=http://backend:3001
# BACKEND_URL runtime dipakai lib/server-fetch.ts (Server Components)
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 BACKEND_URL=$BACKEND_URL
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
