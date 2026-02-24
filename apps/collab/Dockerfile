# syntax=docker/dockerfile:1
#
# Build context: monorepo root
#   docker build -f apps/collab/Dockerfile -t notedraw-collab .
#
# The collab server has no workspace-local dependencies, so we only need
# the root manifest files and the collab package itself.

# ── builder ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (version pinned in root package.json)
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps/collab/package.json apps/collab/
RUN pnpm install --frozen-lockfile --filter @grovebox/collab

# Copy source and compile
COPY apps/collab/ apps/collab/
RUN pnpm --filter @grovebox/collab build

# ── runtime ────────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app/apps/collab

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/collab/package.json ./package.json
COPY --from=builder /app/apps/collab/node_modules ./node_modules
COPY --from=builder /app/apps/collab/dist ./dist

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4001/healthz || exit 1

CMD ["node", "dist/index.js"]
