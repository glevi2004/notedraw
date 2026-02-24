# Notedraw — Deployment Guide

> Last updated: February 2026

This document covers everything needed to deploy all three Notedraw applications (`web`, `collab`, `mcp`) from a fresh environment to a fully running production system.

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Prerequisites](#2-prerequisites)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Database Setup (Neon)](#4-database-setup-neon)
5. [Authentication Setup (Clerk)](#5-authentication-setup-clerk)
6. [File Storage Setup (Vercel Blob)](#6-file-storage-setup-vercel-blob)
7. [Deploying `apps/web` (Vercel)](#7-deploying-appsweb-vercel)
8. [Deploying `apps/collab` (Render)](#8-deploying-appscollab-render)
9. [Deploying `apps/mcp` (Render)](#9-deploying-appsmcp-render)
10. [Post-Deployment Checklist](#10-post-deployment-checklist)
11. [Local Development Setup](#11-local-development-setup)
12. [Staging Environment](#12-staging-environment)
13. [Continuous Deployment](#13-continuous-deployment)
14. [Rollback Procedures](#14-rollback-procedures)
15. [Monitoring & Alerting](#15-monitoring--alerting)

---

## 1. Infrastructure Overview

| Service | Platform | Notes |
|---------|----------|-------|
| `apps/web` | Vercel | Next.js, serverless functions |
| `apps/collab` | Render | Persistent Node.js WebSocket process |
| `apps/mcp` | Render | Long-lived HTTP MCP service |
| Database | Neon (PostgreSQL) | Serverless PostgreSQL |
| File storage | Vercel Blob | S3-compatible blob storage |
| Auth | Clerk | Managed auth, webhooks |
| Cache/pub-sub | Render Key Value (Redis) | Redis pub/sub for collab + MCP checkpoints |
| Error tracking | Sentry | Error monitoring (recommended) |
| Email | Resend | Transactional email for invitations (recommended) |

### Domain Architecture

```
notedraw.com           → apps/web (Vercel) — marketing / landing page
app.notedraw.com       → apps/web (Vercel) — authenticated app
mcp.notedraw.com       → apps/mcp (Render) — MCP server
collab.notedraw.com    → apps/collab (Render) — WebSocket server
```

Vercel handles both `notedraw.com` and `app.notedraw.com` — Next.js middleware can route traffic based on the host header.

---

## 2. Prerequisites

Before starting, you will need accounts at:
- [Vercel](https://vercel.com) (web deployment)
- [Neon](https://neon.tech) (database)
- [Clerk](https://clerk.com) (authentication)
- [Render](https://render.com) (collab + mcp deployment, Key Value / Redis)
- [GitHub](https://github.com) (source code + CI/CD)

Optional but recommended:
- [Sentry](https://sentry.io) (error tracking)
- [Resend](https://resend.com) (email sending)
- [Betterstack](https://betterstack.com) or [UptimeRobot](https://uptimerobot.com) (uptime monitoring)

### Tools Required Locally

```bash
node --version      # 22.x or later
pnpm --version      # 10.x (matches pnpm-workspace.yaml)
vercel --version    # Vercel CLI
```

Install CLIs:
```bash
npm install -g pnpm@10
npm install -g vercel
# Optional: install a Render CLI if you prefer CLI workflows
# (the guide below uses the Render dashboard + render.yaml Blueprint)
```

---

## 3. Environment Variables Reference

### `apps/web` — Complete Variable List

```bash
# ──────────────────────────────────────────────────
# DATABASE (Neon)
# ──────────────────────────────────────────────────
DATABASE_URL="postgresql://USER:PASS@HOST:6543/notedraw?sslmode=require&pgbouncer=true"
DATABASE_URL_UNPOOLED="postgresql://USER:PASS@HOST:5432/notedraw?sslmode=require"

# ──────────────────────────────────────────────────
# AUTHENTICATION (Clerk)
# ──────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# ──────────────────────────────────────────────────
# FILE STORAGE (Vercel Blob)
# ──────────────────────────────────────────────────
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# ──────────────────────────────────────────────────
# REAL-TIME COLLABORATION
# ──────────────────────────────────────────────────
NEXT_PUBLIC_COLLAB_SERVER_URL="https://collab.notedraw.com"

# ──────────────────────────────────────────────────
# AI (OpenRouter)
# ──────────────────────────────────────────────────
OPENROUTER_API_KEY="sk-or-v1-..."

# ──────────────────────────────────────────────────
# TUNE (optional)
# ──────────────────────────────────────────────────
SYNC_FULL_SCENE_INTERVAL_MS=20000   # Default: 20000

# ──────────────────────────────────────────────────
# ERROR TRACKING (Sentry — recommended)
# ──────────────────────────────────────────────────
SENTRY_DSN="https://...@sentry.io/..."
SENTRY_AUTH_TOKEN="..."    # For source map upload (build time only)
SENTRY_ORG="your-org"
SENTRY_PROJECT="notedraw-web"

# ──────────────────────────────────────────────────
# CRON SECURITY
# ──────────────────────────────────────────────────
CRON_SECRET="..."           # Random string; sent as Authorization header by Vercel Cron
```

### `apps/collab` — Complete Variable List

```bash
PORT=4001
COLLAB_ALLOWED_ORIGINS="https://notedraw.com,https://app.notedraw.com"
COLLAB_REDIS_URL="redis://default:PASSWORD@HOST:6379"   # Render Redis / Key Value URL
COLLAB_MAX_PAYLOAD_BYTES=5000000   # 5MB
```

### `apps/mcp` — Complete Variable List

```bash
NODE_ENV=production
MCP_CHECKPOINT_BACKEND="redis"
MCP_REDIS_URL="redis://default:PASSWORD@HOST:6379"
MCP_CHECKPOINT_PREFIX="notedraw:mcp:cp"
NOTEDRAW_SHARE_EXPORT_URL="https://app.notedraw.com/api/share"  # Optional webhook
NOTEDRAW_SHARE_EXPORT_TOKEN="..."                                 # Optional
```

---

## 4. Database Setup (Neon)

### 4.1 Create the Project

1. Log in at [console.neon.tech](https://console.neon.tech)
2. Click **New project**
3. Name it `notedraw-production`
4. Region: pick the same as your Vercel deployment (e.g., `us-east-1`)
5. PostgreSQL version: 16

### 4.2 Get Connection Strings

In the Neon dashboard → **Connection Details**:
- **Pooled connection** (for the app): copy the `DATABASE_URL` — this goes through PgBouncer on port 6543
- **Direct connection** (for migrations): copy the `DATABASE_URL_UNPOOLED` — direct connection on port 5432

Append the following parameters to the **pooled** URL:
```
?sslmode=require&pgbouncer=true&connection_limit=5
```

### 4.3 Run Database Migrations

> **Important:** The project currently uses `prisma db push` for development. Before the first production deploy, you must establish a migration baseline.

```bash
cd apps/web

# 1. Generate the Prisma client
pnpm db:generate

# 2. Create the baseline migration from current schema
# (First-time setup only)
DATABASE_URL="$DATABASE_URL_UNPOOLED" \
  pnpm exec prisma migrate diff \
    --from-empty \
    --to-schema-datamodel prisma/schema.prisma \
    --script \
    > prisma/migrations/0001_initial.sql

# Create migrations directory and tracking table
mkdir -p prisma/migrations/0001_initial
mv prisma/migrations/0001_initial.sql prisma/migrations/0001_initial/migration.sql

# 3. Mark this migration as applied (since schema already matches the DB)
DATABASE_URL="$DATABASE_URL_UNPOOLED" \
  pnpm exec prisma migrate resolve --applied 0001_initial

# 4. For ALL future schema changes, use:
pnpm exec prisma migrate dev --name describe_your_change
```

### 4.4 Deploy Migrations in CI

Add this to your deploy pipeline **before** the Next.js app starts:

```bash
DATABASE_URL="$DATABASE_URL_UNPOOLED" \
  pnpm exec prisma migrate deploy
```

Use the **unpooled** URL here — Prisma Migrate requires a direct connection (PgBouncer does not support the `CREATE TABLE` etc. that migrations use).

### 4.5 Staging Database

Create a separate Neon project (`notedraw-staging`) or use Neon's **database branching** feature:
```bash
# Neon CLI: create a branch from production
neon branches create --project-id <PROJECT_ID> --name staging
```

---

## 5. Authentication Setup (Clerk)

### 5.1 Create a Production Application

1. Log in at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application: **Notedraw (Production)**
3. Enable: Email/Password + OAuth providers (Google recommended)
4. Go to **API Keys** → copy `Publishable key` and `Secret key`

### 5.2 Configure Redirect URLs

In Clerk dashboard → **Paths**:
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in URL: `/dashboard`
- After sign-up URL: `/onboarding`

### 5.3 Add Allowed Origins

In Clerk dashboard → **Domains**:
- Add `https://notedraw.com`
- Add `https://app.notedraw.com`

### 5.4 Configure the Webhook

1. In Clerk dashboard → **Webhooks** → **Add endpoint**
2. URL: `https://app.notedraw.com/api/webhooks/clerk`
3. Events to subscribe to:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the **Signing Secret** → set as `CLERK_WEBHOOK_SECRET`

### 5.5 Staging Clerk Application

Create a second Clerk application: **Notedraw (Staging)**. Use separate keys for the staging environment. Never share keys between environments.

---

## 6. File Storage Setup (Vercel Blob)

Vercel Blob is automatically available when you link your Vercel project.

### 6.1 Create a Blob Store

In Vercel dashboard → your project → **Storage** → **Create Blob Store**:
- Name: `notedraw-blob`
- This generates a `BLOB_READ_WRITE_TOKEN` automatically

### 6.2 Staging Blob Store

Create a separate blob store: `notedraw-blob-staging`. Use the staging token in the staging environment.

---

## 7. Deploying `apps/web` (Vercel)

### 7.1 Connect the Repository

```bash
# From the repo root
vercel link

# If starting fresh:
vercel            # Follow prompts to create a new Vercel project
# Framework: Next.js
# Root directory: apps/web
```

### 7.2 Configure Build Settings

In Vercel dashboard → project → **Settings** → **Build & Output Settings**:
- **Framework**: Next.js (auto-detected)
- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && pnpm build --filter=@notedraw/web`
- **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
- **Output Directory**: `.next` (auto-detected)

> **Why go up to root?** The monorepo packages (excalidraw, etc.) must be built before the web app. Turbo handles this when run from the root.

Alternatively, set up a `vercel.json` at `apps/web/vercel.json`:
```json
{
  "buildCommand": "cd ../.. && pnpm build --filter=@notedraw/web",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile"
}
```

### 7.3 Set Environment Variables

In Vercel dashboard → project → **Settings** → **Environment Variables**:

Add all variables from the [apps/web section](#appsweb--complete-variable-list) above.

Set the correct **environment** for each:
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`: Production
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: All environments (different values per env)
- `SENTRY_AUTH_TOKEN`: Only needed at build time (set for Production)

### 7.4 Configure Custom Domain

In Vercel dashboard → project → **Domains**:
1. Add `notedraw.com` and `app.notedraw.com`
2. Follow Vercel's DNS instructions to add CNAME/A records at your DNS provider
3. Wait for SSL certificate provisioning (usually < 5 minutes)

### 7.5 Configure Cron Jobs

Add to `apps/web/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Protect the cron endpoint with a secret:
- Add `CRON_SECRET` to Vercel environment variables
- In the route handler, verify: `Authorization: Bearer ${CRON_SECRET}`

### 7.6 First Deploy

```bash
# From apps/web directory (or root)
vercel --prod
```

After deploy completes:
1. Run database migrations (see section 4.3)
2. Verify the Clerk webhook URL is accessible
3. Test authentication flow end-to-end

### 7.7 Subsequent Deploys

Push to `main` branch → Vercel automatically rebuilds and deploys. Preview deployments are created for every pull request.

---

## 8. Deploying `apps/collab` (Render)

The collab server requires a persistent WebSocket process, so it runs as a Render Docker web service (not on Vercel).

### 8.1 Use the Render Blueprint (`render.yaml`)

This repository includes a root Blueprint at `render.yaml` that provisions:
- `notedraw-redis` (Render Key Value / Redis)
- `notedraw-collab` (Docker web service)
- `notedraw-mcp` (Docker web service)

In the Render dashboard:
1. Create a new **Blueprint** deployment
2. Connect this GitHub repository
3. Select the `main` branch
4. Use `render.yaml` from the repository root
5. Apply the Blueprint

### 8.2 Collab service configuration (from Blueprint)

The collab service is configured to:
- Build with Dockerfile: `apps/collab/Dockerfile`
- Use monorepo root as the Docker build context
- Expose health check path: `/healthz`
- Attach custom domain: `collab.notedraw.com`

Required environment variables (managed in `render.yaml` / Render dashboard):
- `NODE_ENV=production`
- `COLLAB_ALLOWED_ORIGINS=https://notedraw.com,https://app.notedraw.com`
- `COLLAB_REDIS_URL` (injected from Render Key Value / Redis)

Optional:
- `COLLAB_MAX_PAYLOAD_BYTES`
- `SENTRY_DSN`
- `LOG_LEVEL`

### 8.3 Verify collab deployment

After the service is live:

```bash
# Health
curl https://notedraw-collab.onrender.com/healthz

# Metrics (optional)
curl https://notedraw-collab.onrender.com/metrics
```

Expected:
- `/healthz` → `{"ok":true}`
- `/metrics` → Prometheus metrics including `collab_connections` / `collab_messages`

### 8.4 Configure custom domain

In Render dashboard → `notedraw-collab` service → **Settings** → **Custom Domains**:
1. Add `collab.notedraw.com`
2. Add the DNS records Render provides at your DNS provider
3. Wait for TLS to be issued

Once live, ensure the Vercel web app variable is:

```bash
NEXT_PUBLIC_COLLAB_SERVER_URL=https://collab.notedraw.com
```

### 8.5 Scaling

For higher concurrency:
- Increase instance size in Render
- Increase instance count (horizontal scaling)
- Keep `COLLAB_REDIS_URL` configured so the Redis adapter can share room state across instances

---

## 9. Deploying `apps/mcp` (Render)

The MCP server runs as a long-lived HTTP service on Render (Docker), not as a Vercel serverless function.

### 9.1 MCP service configuration (from Blueprint)

The Blueprint configures `notedraw-mcp` to:
- Build with Dockerfile: `apps/mcp/Dockerfile`
- Use monorepo root as the Docker build context
- Expose health check path: `/healthz`
- Attach custom domain: `mcp.notedraw.com`

Required environment variables:
- `NODE_ENV=production`
- `MCP_CHECKPOINT_BACKEND=redis`
- `MCP_REDIS_URL` (injected from Render Key Value / Redis)
- `MCP_CHECKPOINT_PREFIX=notedraw:mcp:cp`

Optional:
- `SENTRY_DSN`
- `NOTEDRAW_SHARE_EXPORT_URL`
- `NOTEDRAW_SHARE_EXPORT_TOKEN`

### 9.2 Verify MCP deployment

```bash
# Health check
curl https://notedraw-mcp.onrender.com/healthz

# CORS / endpoint sanity (OPTIONS)
curl -i -X OPTIONS https://notedraw-mcp.onrender.com/mcp

# Basic MCP JSON-RPC request
curl -X POST https://notedraw-mcp.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### 9.3 Configure custom domain

In Render dashboard → `notedraw-mcp` service → **Settings** → **Custom Domains**:
1. Add `mcp.notedraw.com`
2. Add the DNS records Render provides at your DNS provider
3. Wait for TLS to be issued

### 9.4 Notes on checkpoint storage

MCP checkpoints now use standard Redis URLs (`MCP_REDIS_URL`) and are compatible with Render Key Value / Redis. Upstash/Vercel KV REST environment variables are no longer used.

---

## 10. Post-Deployment Checklist

After deploying all three apps for the first time:

### Database

- [ ] Run `prisma migrate deploy` against production database
- [ ] Verify Prisma Studio can connect: `DATABASE_URL=... pnpm db:studio`
- [ ] Run `pnpm db:backfill-search` to index existing scenes (if migrating data)

### Authentication

- [ ] Visit `https://app.notedraw.com/sign-in` — Clerk sign-in renders correctly
- [ ] Sign up with a new account — onboarding flow completes
- [ ] Verify user record created in database
- [ ] Test Clerk webhook: create a new user, check it appears in `User` table

### Collaboration

- [ ] Visit `https://collab.notedraw.com/healthz` — returns `{"ok":true}`
- [ ] Open a scene in two different browsers — verify both cursors appear
- [ ] Draw a shape in one browser — verify it appears in the other

### MCP Server

- [ ] `curl https://mcp.notedraw.com/mcp` (OPTIONS) — returns 200 with CORS headers
- [ ] Test `tools/list` call returns the 5 expected tools

### File Storage

- [ ] Upload a workspace logo — appears in settings
- [ ] Add an image to a scene — renders correctly in the editor

### AI

- [ ] Open a scene → AI chat input appears (if workspace has `aiEnabled: true`)
- [ ] Send a message — stream response received
- [ ] AI creates a shape on the canvas

### Security

- [ ] `https://app.notedraw.com/dashboard` redirects unauthenticated users to sign-in
- [ ] `https://app.notedraw.com/api/scenes` returns 401 without auth
- [ ] `https://app.notedraw.com/share/[valid-id]` is accessible without auth

---

## 11. Local Development Setup

### 11.1 Install Dependencies

```bash
# Clone the repo
git clone https://github.com/your-org/notedraw.git
cd notedraw

# Install all packages
pnpm install
```

### 11.2 Environment Files

```bash
# Copy environment templates
cp apps/web/.env.example apps/web/.env.local
cp apps/collab/.env.example apps/collab/.env
cp apps/mcp/.env.example apps/mcp/.env
```

Fill in values for each file. For local development:
- Use a local PostgreSQL database or a Neon dev branch
- Use Clerk test keys (prefixed `pk_test_`, `sk_test_`)
- Leave Redis URLs blank (apps will use in-memory fallback)

### 11.3 Database Setup (Local)

**Option A: Neon dev branch (recommended)**
```bash
# Create a dev branch in Neon dashboard
# Copy the branch connection string to DATABASE_URL in apps/web/.env.local
cd apps/web
pnpm db:push    # Sync schema to dev branch
pnpm db:seed    # Load sample data
```

**Option B: Local PostgreSQL via Docker**
```bash
docker run -d \
  --name notedraw-pg \
  -e POSTGRES_DB=notedraw \
  -e POSTGRES_USER=notedraw \
  -e POSTGRES_PASSWORD=notedraw \
  -p 5432:5432 \
  postgres:16-alpine

# Set in apps/web/.env.local:
# DATABASE_URL="postgresql://notedraw:notedraw@localhost:5432/notedraw"
cd apps/web
pnpm db:push
pnpm db:seed
```

### 11.4 Start All Apps

```bash
# From repo root — starts web, collab, and mcp concurrently
pnpm dev
```

Or start individually:
```bash
# Terminal 1: Web app
pnpm --filter @notedraw/web dev

# Terminal 2: Collab server
pnpm --filter @notedraw/collab dev

# Terminal 3: MCP server (optional)
pnpm --filter @notedraw/mcp dev
```

### 11.5 Access Points

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| Collab server | http://localhost:4001 |
| MCP server | http://localhost:3001 (or configured port) |
| Prisma Studio | http://localhost:5555 (run `pnpm db:studio`) |

---

## 12. Staging Environment

Maintain a staging environment that mirrors production for safe testing of changes.

### 12.1 Infrastructure

| Service | Staging Setup |
|---------|--------------|
| Web app | Vercel preview deployments (automatic) |
| Database | Separate Neon project or Neon branch |
| Collab server | Render staging web service (optional) |
| MCP server | Render staging web service (optional) |
| Clerk | Separate Clerk application |
| Blob storage | Separate Vercel Blob store |

### 12.2 Vercel Preview Deployments

Every pull request to `main` automatically gets a Vercel preview deployment. To configure staging-specific variables:

In Vercel → project → **Environment Variables**:
- Add variables with environment: `Preview`
- Use staging-specific Clerk keys, database URL, etc.

### 12.3 Staging Backends on Render

Recommended approach:
1. Create a staging Blueprint or duplicate the production Render services
2. Use staging domains (for example `collab-staging.notedraw.com`, `mcp-staging.notedraw.com`)
3. Point `COLLAB_ALLOWED_ORIGINS` at the Vercel preview domain(s)
4. Use a separate Render Key Value / Redis instance for staging

---

## 13. Continuous Deployment

### 13.1 GitHub Actions — CI Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  ci:
    name: Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: '10.24.0'

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages (not apps)
        run: pnpm turbo build --filter='./packages/*'

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

      - name: Check formatting
        run: pnpm format:check
```

### 13.2 GitHub Actions — Deploy Render Backends on Merge

Create `.github/workflows/deploy-backends.yml`:

```yaml
name: Deploy Render Backends

on:
  push:
    branches: [main]
    paths:
      - 'apps/collab/**'
      - 'apps/mcp/**'
      - 'render.yaml'
      - '.github/workflows/deploy-backends.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger Render Blueprint deploy
        run: curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL"
        env:
          RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
```

### 13.3 GitHub Actions — Database Migrations on Deploy

Create `.github/workflows/migrate.yml`:

```yaml
name: Run Migrations

on:
  deployment_status:
    # Only runs after Vercel marks the deployment as successful

jobs:
  migrate:
    if: github.event.deployment_status.state == 'success' &&
        github.event.deployment_status.environment == 'Production'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with: { version: '10.24.0' }

      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }

      - run: pnpm install --frozen-lockfile

      - name: Run migrations
        run: |
          cd apps/web
          pnpm exec prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_UNPOOLED }}
```

### 13.4 Required GitHub Secrets

Add these in GitHub → repository → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Description |
|--------|-------------|
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL for backend Blueprint/service |
| `TURBO_TOKEN` | Turborepo remote cache token |
| `TURBO_TEAM` | Turborepo team slug |
| `DATABASE_URL_UNPOOLED` | Direct DB URL for migrations |

---

## 14. Rollback Procedures

### 14.1 Rolling Back `apps/web`

In Vercel dashboard → project → **Deployments** → find the previous successful deployment → click **"..."** → **Promote to Production**.

Or via CLI:
```bash
vercel rollback [DEPLOYMENT_URL]
```

### 14.2 Rolling Back `apps/collab` and `apps/mcp`

Use Render dashboard:
1. Open the service (`notedraw-collab` or `notedraw-mcp`)
2. Go to **Events / Deploys**
3. Select the previous successful deploy
4. Redeploy that commit/image

### 14.3 Rolling Back Database Migrations

Prisma does not support automatic rollback. Rollback procedures:

1. **For additive changes** (new tables, new columns): the old app version will simply ignore the new columns — safe to rollback
2. **For destructive changes** (dropped columns, renamed tables): requires a manual rollback migration

For any destructive migration, always:
1. Write a companion rollback migration before deploying
2. Test the rollback migration on staging first
3. Store rollback SQL in `prisma/rollbacks/` directory

### 14.4 Emergency Rollback Runbook

If a deploy breaks production:

```
1. Vercel: rollback web app immediately (< 2 minutes)
2. Render: rollback `notedraw-collab` / `notedraw-mcp` if they were deployed
3. Database: if migration was run, assess whether rollback is safe
   - If additive: no action needed, old app works with new schema
   - If destructive: run rollback migration ASAP
4. Notify users via status page if outage > 5 minutes
5. Post-mortem: document root cause and preventive measures
```

---

## 15. Monitoring & Alerting

### 15.1 Uptime Monitoring

Configure checks at [BetterStack](https://betterstack.com) or UptimeRobot for all three services:

| Service | Check URL | Expected |
|---------|-----------|---------|
| Web app | `https://app.notedraw.com/api/health` | `{"ok":true}` |
| Collab server | `https://collab.notedraw.com/healthz` | `{"ok":true}` |
| MCP server | `https://mcp.notedraw.com/mcp` | 200 with CORS headers |

Check interval: 1 minute. Alert after: 2 consecutive failures (2 minutes downtime).

Alert channels: Slack + email.

### 15.2 Error Tracking (Sentry)

After Sentry is integrated (see Production Readiness plan):

- Set alert rules:
  - New issue → notify immediately
  - Issue affects > 5% of sessions → high severity alert
  - Error rate spike (> 2x baseline) → alert

- Performance monitoring:
  - P95 API response time > 2s → alert
  - Web Vitals: LCP > 3s on dashboard route → alert

### 15.3 Collab Server Metrics

The collab server exposes Prometheus-format metrics at `/metrics`:
```
collab_connections <count>
collab_messages <count>
```

On Render, you can scrape these via your own Prometheus/Grafana stack or use an external metrics collector.

Set an alert if `collab_connections` drops to 0 during peak hours (indicates a server crash).

### 15.4 Database Monitoring

In Neon dashboard → **Monitoring**:
- Set alerts for: connection count > 80% of limit, query latency P95 > 500ms

For production workloads, consider [PgHero](https://github.com/ankane/pghero) or Neon's query insights for slow query identification.

### 15.5 Vercel Analytics

Enable Vercel Analytics and Speed Insights in the Vercel dashboard:
- Track: page load time, TTFB, LCP, CLS per route
- Set budget alerts for Core Web Vitals regressions

---

## Appendix A: Quick Reference — Deploy Commands

```bash
# Web app
vercel --prod --cwd apps/web

# Backend services (Render)
# Apply / update render.yaml in Render, or trigger your Render deploy hook

# Run DB migrations
cd apps/web && DATABASE_URL="$DATABASE_URL_UNPOOLED" pnpm exec prisma migrate deploy

# View backend logs
# Use the Render dashboard logs for `notedraw-collab` / `notedraw-mcp`

# Rollback web
vercel rollback

# Rollback collab / mcp
# Use Render dashboard → previous deploy → Redeploy
```

## Appendix B: Environment Variable Checklist

Copy this checklist when setting up a new environment:

**apps/web (Vercel)**
- [ ] `DATABASE_URL` (pooled)
- [ ] `DATABASE_URL_UNPOOLED` (direct)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_WEBHOOK_SECRET`
- [ ] `BLOB_READ_WRITE_TOKEN`
- [ ] `NEXT_PUBLIC_COLLAB_SERVER_URL`
- [ ] `OPENROUTER_API_KEY`
- [ ] `SENTRY_DSN` (if using Sentry)
- [ ] `CRON_SECRET`

**apps/collab (Render)**
- [ ] `COLLAB_ALLOWED_ORIGINS`
- [ ] `COLLAB_REDIS_URL`
- [ ] `COLLAB_MAX_PAYLOAD_BYTES`

**apps/mcp (Render)**
- [ ] `MCP_CHECKPOINT_BACKEND` (`redis`)
- [ ] `MCP_REDIS_URL`
- [ ] `MCP_CHECKPOINT_PREFIX`
- [ ] `NODE_ENV`
