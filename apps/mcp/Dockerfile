# syntax=docker/dockerfile:1
#
# Build context: monorepo root
#   docker build -f apps/mcp/Dockerfile -t notedraw-mcp .

FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (version pinned in root package.json)
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Install dependencies first (improves cache hits)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps/mcp/package.json apps/mcp/
COPY packages/ai-contracts/package.json packages/ai-contracts/
COPY packages/scene-ops/package.json packages/scene-ops/
COPY packages/common/package.json packages/common/
COPY packages/element/package.json packages/element/
COPY packages/excalidraw/package.json packages/excalidraw/
COPY packages/math/package.json packages/math/
COPY packages/utils/package.json packages/utils/
RUN pnpm install --frozen-lockfile --filter @grovebox/mcp...

# Copy source and build
COPY apps/mcp/ apps/mcp/
COPY packages/ai-contracts/ packages/ai-contracts/
COPY packages/scene-ops/ packages/scene-ops/
COPY packages/common/ packages/common/
COPY packages/element/ packages/element/
COPY packages/excalidraw/ packages/excalidraw/
COPY packages/math/ packages/math/
COPY packages/utils/ packages/utils/
# The MCP build uses `bun build`; ensure the package-local bun shim exists in Docker.
RUN node apps/mcp/scripts/setup-bun.mjs && /app/apps/mcp/node_modules/.bin/bun --version
ENV PATH="/app/apps/mcp/node_modules/.bin:${PATH}"
RUN pnpm --filter @grovebox/mcp build

FROM node:22-alpine AS runtime
WORKDIR /app/apps/mcp

ENV NODE_ENV=production

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/mcp/package.json ./package.json
COPY --from=builder /app/apps/mcp/node_modules ./node_modules
COPY --from=builder /app/apps/mcp/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3001}/healthz" || exit 1

CMD ["node", "dist/index.js"]
