FROM node:20-alpine AS base
WORKDIR /app

# ─── Dependencies stage ───────────────────────────────────────────
FROM base AS deps
COPY apps/backend/package*.json ./
RUN npm ci --omit=dev

# ─── Build stage ──────────────────────────────────────────────────
FROM base AS builder
COPY apps/backend/package*.json ./
RUN npm ci
COPY apps/backend/ .
COPY tsconfig.base.json /tsconfig.base.json
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 rakshaai
USER rakshaai

COPY --from=deps    --chown=rakshaai:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=rakshaai:nodejs /app/dist         ./dist
COPY --from=builder --chown=rakshaai:nodejs /app/src/prisma   ./src/prisma

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "dist/server.js"]
