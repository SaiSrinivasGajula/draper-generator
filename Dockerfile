# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
# better-sqlite3 needs a C++ toolchain and python to build from source on install
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && apt-get clean
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
# they must be passed as build args (see fly-deploy.yml), not just runtime
# secrets — a runtime-only secret would never reach the compiled JS.
ARG NEXT_PUBLIC_STYLIST_WHATSAPP_NUMBER=""
ARG NEXT_PUBLIC_STYLIST_DISPLAY_NAME=""
ENV NEXT_PUBLIC_STYLIST_WHATSAPP_NUMBER=$NEXT_PUBLIC_STYLIST_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_STYLIST_DISPLAY_NAME=$NEXT_PUBLIC_STYLIST_DISPLAY_NAME
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Fly volume is mounted here; matches DATA_DIR
ENV DATA_DIR=/data

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs && mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
