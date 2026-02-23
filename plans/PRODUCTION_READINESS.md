# Notedraw — Production Readiness Plan

> Written: February 2026
> Author: Engineering Review
> Status: Pre-launch audit — covers all three apps (`web`, `collab`, `mcp`) and all shared packages

---

## How to read this document

Each section is labeled with a priority:

| Priority | Meaning |
|----------|---------|
| **P0 — Blocker** | Must be done before any production traffic. App will fail, data will be lost, or users will be exposed to security risk. |
| **P1 — High** | Must be done before launch. Causes degraded UX, silent data loss, or missing core feature. |
| **P2 — Medium** | Should be done soon after launch. Operational risk, tech debt that compounds, or feature gaps. |
| **P3 — Nice-to-have** | Low urgency. Improvements for scale, DX, or polish. |

---

## 1. Security

### 1.1 TypeScript build errors silenced — P0 ✅ DONE

`apps/web/next.config.mjs` has `typescript: { ignoreBuildErrors: true }`. This was added to accommodate Excalidraw's Vite-native types, but it means **any TypeScript error anywhere in the codebase silently passes the build**. Shipping with this in production means a class of runtime crashes is completely invisible at build time.

**Action:**
1. Run `pnpm typecheck` and capture all errors: `pnpm -F web typecheck 2>&1 | tee ts-errors.txt`.
2. Separate Excalidraw errors (in `packages/`) from app errors (in `apps/web/`).
3. For app errors: fix them. They are real bugs.
4. For Excalidraw package errors: suppress only those packages via `paths` overrides or a targeted `// @ts-ignore` with a comment, not a blanket build flag.
5. Remove `ignoreBuildErrors: true` once app-level errors are clean.

---

### 1.2 Missing security headers — P0 ✅ DONE

There are no HTTP security headers configured. The Next.js config adds no `headers()` function. Without these, the app is vulnerable to:
- Clickjacking (no `X-Frame-Options` or `frame-ancestors` CSP directive)
- MIME sniffing (no `X-Content-Type-Options`)
- XSS (no `Content-Security-Policy`)
- Protocol downgrade (no `Strict-Transport-Security`)

**Action:** Add a `headers()` export to `apps/web/next.config.mjs`:

```js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
        // CSP is complex — start with report-only and tune before enforcing
        {
          key: 'Content-Security-Policy-Report-Only',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.notedraw.com; ...",
        },
      ],
    },
  ]
},
```

Start with `Content-Security-Policy-Report-Only` + a report endpoint. Excalidraw uses `eval` for math expressions, so `unsafe-eval` is required in the canvas context — scope it narrowly.

---

### 1.3 Collab server CORS misconfiguration — P0 ✅ DONE

In `apps/collab/src/index.ts`:

```ts
origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true,
```

If `COLLAB_ALLOWED_ORIGINS` is unset or empty, `origin: true` allows **any origin** to connect to the WebSocket server. In production this must never be the fallback.

**Action:** Change the fallback to `false` (deny all) and throw at startup if the variable is missing in production:

```ts
if (process.env.NODE_ENV === 'production' && !ALLOWED_ORIGINS.length) {
  console.error('COLLAB_ALLOWED_ORIGINS must be set in production');
  process.exit(1);
}
const origin = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false;
```

---

### 1.4 Clerk webhook signature not verified — P1 ✅ DONE (was already implemented)

Check `apps/web/app/api/webhooks/clerk/route.ts`. Clerk sends a `svix-signature` header that must be verified before trusting the payload. Without verification, any attacker can POST fake user events (user creation, deletion) to this endpoint.

**Action:** Use the `svix` package to verify the webhook:

```ts
import { Webhook } from 'svix';

const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
await wh.verify(rawBody, {
  'svix-id': req.headers.get('svix-id')!,
  'svix-timestamp': req.headers.get('svix-timestamp')!,
  'svix-signature': req.headers.get('svix-signature')!,
});
```

---

### 1.5 API rate limiting — P1 ✅ DONE

There is no rate limiting on any API route. This exposes:
- `/api/ai/scene-chat` to LLM cost abuse (each request costs money)
- `/api/workspaces` invite endpoints to enumeration
- `/api/share` to scraping

**Action:** Add rate limiting using Vercel's `@vercel/kv` + a middleware, or integrate `upstash/ratelimit` which is already available (Upstash is used by the MCP app). Apply limits:
- AI chat: 20 requests / minute per user
- Scene save: 60 requests / minute per user
- Share create: 10 requests / minute per user
- Public share read: 200 requests / minute per IP

---

### 1.6 Vercel Blob public access — P1 ✅ DONE

`@vercel/blob` tokens and blob URLs need to be audited:
- Are share snapshot blobs publicly readable by URL (intentional)?
- Are workspace logos public (acceptable, but verify)?
- Are collab file uploads public or private?

**Action:**
- Collab file uploads should use `access: 'public'` only if the collab room is public. If private, use signed URLs.
- Workspace logos: `access: 'public'` is fine.
- Share snapshots: intentionally public by design — document this explicitly.
- Add `expiresAt` enforcement: delete expired `ShareSnapshot` blob paths via a cron job (see section 6.4).

---

### 1.7 No input sanitization on scene content — P1 ✅ DONE (size limit + shape validation)

`Scene.content` accepts a raw `Json` field from the client. While Prisma prevents SQL injection, if the content is ever rendered as HTML (e.g., in the note editor or share view), XSS is possible via malicious `noteContent` payloads.

**Action:**
- In the scene save route (`PATCH /api/scenes/[id]`), validate the content shape using a Zod schema (the packages already have `ai-contracts` Zod schemas — extend these for scene save).
- Sanitize any HTML in `noteContent` fields using `DOMPurify` on the server before storing, or trust the BlockNote serialization format and validate its schema strictly.

---

### 1.8 Environment variable secrets audit — P1 ✅ DONE

Before any production deployment:
- Rotate all keys from `.env.local` (test Clerk keys, test tokens)
- Use Vercel's encrypted environment variables for all secrets
- Ensure `CLERK_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, `BLOB_READ_WRITE_TOKEN` are **never** prefixed with `NEXT_PUBLIC_`
- Audit: `grep -r "NEXT_PUBLIC_" apps/web/.env*` — only truly public values should be there

---

### 1.9 CSRF protection — P2 ✅ DONE

Next.js App Router API routes are not automatically CSRF-protected. Any form POST from a malicious third-party site could be submitted to the API with the user's session cookies.

**Action:** For state-mutating API routes, require a custom `X-Requested-With: XMLHttpRequest` header, or use the `SameSite=Lax` cookie policy (Clerk handles session cookies — verify Clerk's SameSite setting).

---

## 2. Database

### 2.1 No database migrations — P0 ✅ DONE

The project uses `db:push` (schema sync) instead of Prisma Migrate. This is fine during development but **is not safe for production**:
- `db:push` can silently drop columns
- There is no migration history or rollback capability
- Schema changes cannot be applied to a live database without downtime risk

**Action:**
1. At the point of first production deploy, snapshot the current schema as the baseline migration: `pnpm prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0001_initial.sql`
2. From this point forward, use `prisma migrate dev` for all schema changes
3. Configure the production deploy pipeline to run `prisma migrate deploy` before the app starts
4. Never run `db:push` against the production database

---

### 2.2 Scene content JSON size — P1 ✅ DONE

`Scene.content` is stored as a `Json` column in PostgreSQL. A complex Excalidraw scene with hundreds of elements and embedded images can grow to 5–20 MB. Storing large blobs in a relational database column:
- Slows down all queries that select the scene row
- Increases Neon serverless costs (data egress billed per GB)
- Risks hitting PostgreSQL's `toast` limits at very large sizes

**Action:**
1. Add a server-side size limit on the `PATCH /api/scenes/[id]` route: reject payloads above 5 MB with a 413 error
2. For images embedded directly in scene JSON (base64), move them to Vercel Blob and store only references in the scene content (Excalidraw supports this via its `files` map — use the collab file upload mechanism)
3. Consider adding a `contentSize` integer column to `Scene` to track size without fetching content

---

### 2.3 Full-text search not production-ready — P1 ✅ DONE

`Scene.searchText` stores plain text for search. This is likely queried with a `LIKE '%term%'` pattern, which:
- Does a full table scan (no index benefit)
- Is case-sensitive by default in PostgreSQL
- Does not support ranked results

**Action:**
1. Add a `@@index([searchText])` GIN index to the Scene model using PostgreSQL full-text search: `searchText String? @db.Text` + `CREATE INDEX scene_search_idx ON "Scene" USING GIN (to_tsvector('english', "searchText"))`
2. Or migrate to using PostgreSQL's `ts_vector` generated column
3. If on Neon, use Neon's built-in full-text search extension
4. The existing `db:backfill-search` script should be updated to use the new index

---

### 2.4 Missing database indexes for common queries — P2 ✅ DONE

Review common access patterns against the schema:
- `WorkspaceActivityLog` is queried by `workspaceId + createdAt` — index exists. Good.
- `WorkspaceInvitation` lookup by `token` — unique index exists. Good.
- `Scene` lookup by `collectionId + updatedAt` — only `collectionId` index exists. Add composite.
- `CollabRoom` lookup by `sceneId + revokedAt` to find active rooms — no index on `revokedAt`.

**Action:** Add:
```prisma
@@index([collectionId, updatedAt])  // on Scene
@@index([sceneId, revokedAt])       // on CollabRoom
@@index([sceneId, revokedAt])       // on ShareSnapshot
```

---

### 2.5 Neon database connection limits — P2 ✅ DONE

Neon's serverless PostgreSQL has connection limits per plan. Next.js serverless functions create a new Prisma client connection per cold start. With multiple concurrent Vercel function instances, you can exhaust the connection pool.

**Action:**
1. Ensure `DATABASE_URL` points to Neon's **pooled** connection string (PgBouncer endpoint, port 6543)
2. Use `DATABASE_URL_UNPOOLED` only for Prisma Migrate (`migrate deploy`) — set this in your deploy script
3. Configure Prisma connection pool: `datasource db { url = env("DATABASE_URL") }` with `?pgbouncer=true&connection_limit=5` appended to the URL
4. Add `export const runtime = 'nodejs'` to any API routes that must use Prisma (prevent edge runtime issues)

---

## 3. Reliability & Error Handling

### 3.1 No error tracking — P0 ✅ DONE

The app has no error tracking service. When something crashes in production, there is no alert, no stack trace, no user impact visibility.

**Action:** Integrate Sentry:
- `apps/web`: Add `@sentry/nextjs` — run `npx @sentry/wizard@latest -i nextjs`
- `apps/collab`: Add `@sentry/node` and wrap the Socket.IO error handler
- `apps/mcp`: Add `@sentry/node` to the express server
- Configure `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in all environments
- Source maps are already being generated (turbopack) — upload them to Sentry on each deploy

---

### 3.2 Export/import jobs have no background processor — P1 ✅ DONE

`WorkspaceExportJob` and `WorkspaceImportJob` models exist with a `status` field, but there is no background job processor. When a user triggers an export, the API likely runs it synchronously in the request handler, which will time out for large workspaces (Vercel functions time out at 10s on Hobby, 60s on Pro).

**Action:**
1. Move export/import processing to a Vercel Cron Job or a proper queue (options: Trigger.dev, Inngest, or a simple Vercel Edge Function with background processing via `after()` in Next.js 15+)
2. Use Next.js 15's `after()` API for lightweight post-response processing
3. For large exports, use streaming: write to Vercel Blob incrementally and update job status as chunks complete
4. Add email notification when export completes (or webhook to trigger a notification)

---

### 3.3 No graceful shutdown in collab server — P1 ✅ DONE

The `apps/collab` Node.js server has no `SIGTERM` handler. When the container or process is killed (e.g., during a deployment), all active Socket.IO connections are abruptly terminated, causing users to lose unsaved data.

**Action:**
```ts
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, draining connections...');
  io.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
  // Force exit after 10s if connections don't drain
  setTimeout(() => process.exit(1), 10_000);
});
```

---

### 3.4 Scene auto-save has no retry on failure — P1 ✅ DONE

When the 10-second throttled save fails (network error, 5xx), there is no retry. The user's changes are silently lost on navigation.

**Action:**
1. Add retry logic with exponential backoff (2 retries max) to the scene save function
2. If all retries fail, show a persistent toast: "Changes couldn't be saved — check your connection"
3. Store unsaved changes in `localStorage` as a fallback; attempt to sync on next page load
4. Track a dirty state flag (`hasUnsavedChanges`) and warn the user via `beforeunload` if changes are pending

---

### 3.5 Unhandled Promise rejections in API routes — P2 ✅ DONE

API route handlers should wrap async logic in try/catch and return consistent error shapes. Without this, an uncaught exception in a route returns a generic 500 with no useful client-side information.

**Action:**
1. Create a `lib/api-handler.ts` wrapper that wraps all route handlers in a try/catch and logs to Sentry
2. Return structured error responses: `{ error: { code: string, message: string } }`
3. Distinguish between 4xx (client errors, don't alert) and 5xx (server errors, alert on Sentry)

---

## 4. Performance

### 4.1 No image optimization configured — P1 ✅ DONE

`next.config.mjs` has no `images` configuration. The app uses `<img>` tags directly rather than Next.js `<Image>` in several places (workspace logos, user avatars from Clerk). This means:
- No automatic WebP/AVIF conversion
- No responsive sizing
- Potential CLS (Cumulative Layout Shift) from missing dimensions

**Action:**
1. Add `images: { domains: [...] }` or `images: { remotePatterns: [...] }` to `next.config.mjs` for Clerk image CDN and Vercel Blob domains
2. Replace `<img>` tags for user avatars and workspace logos with Next.js `<Image>`
3. Add `width` and `height` props (or `fill` with a relative container) to prevent CLS

---

### 4.2 No bundle analysis — P2 ✅ DONE

There is no bundle size visibility. The custom Excalidraw packages are transpiled from raw TypeScript source, which could include unintended large dependencies.

**Action:**
1. Add `@next/bundle-analyzer`: `ANALYZE=true pnpm build`
2. Set a bundle size budget in CI (e.g., first load JS < 250 KB for the dashboard route)
3. Verify that Excalidraw packages are tree-shaken correctly and not duplicating dependencies (e.g., `react`, `roughjs`)

---

### 4.3 Scene list loads all scenes — P2 ✅ DONE

The `GET /api/scenes` route likely fetches all scenes for a workspace without pagination. A workspace with hundreds of scenes will load slowly and strain the database.

**Action:**
1. Add cursor-based or offset pagination to all list endpoints: `?cursor=<id>&limit=50`
2. Return `{ items: Scene[], nextCursor: string | null }` from list endpoints
3. Implement infinite scroll or "Load more" in the sidebar

---

### 4.4 Excalidraw packages transpiled from source on every build — P2

`transpilePackages` forces Next.js to compile all `@excalidraw/*` packages from raw TypeScript on every build. For a large package like Excalidraw, this significantly increases build times.

**Action:**
1. Build the local packages to a `dist/` output as part of the Turbo `build` pipeline
2. Update `transpilePackages` to only be needed in development (or remove it if packages have a built output)
3. This change requires updating `packages/*/package.json` to add `"main"/"module"` fields pointing to `dist/`

---

### 4.5 No caching strategy for API routes — P2 ✅ DONE

All API routes return no cache headers. Endpoints like `GET /api/workspaces`, `GET /api/scenes`, and `GET /api/share/[id]` could benefit from short-lived caching.

**Action:**
- `GET /api/share/[id]` (public read-only): add `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `GET /api/scenes` (authenticated, per-user): add `Cache-Control: private, max-age=10, stale-while-revalidate=30`
- Use Next.js Route Segment Config `export const revalidate = 60` where appropriate

---

## 5. Testing & Quality

### 5.1 No CI/CD pipeline — P0

There are no GitHub Actions workflows. Code can be merged and deployed without any automated checks. Broken builds, type errors, and test failures are only discovered after deploy.

**Action:** Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '10.24.0' }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build --filter=!@notedraw/web  # build packages only
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm format:check
```

For Vercel preview deployments, connect the GitHub repo to Vercel — it handles preview builds automatically.

---

### 5.2 Minimal test coverage — P1

Only one test file exists (`ExcalidrawWithNotes.test.tsx`). The entire API layer, auth layer, scene saving logic, permission model, and collab server are untested.

**Prioritized testing targets:**

| Area | Test type | Priority |
|------|-----------|----------|
| `lib/auth.ts` permission checks | Unit | P0 |
| Scene save throttle + version tracking | Unit | P0 |
| `/api/scenes/[id]` PATCH | Integration | P1 |
| `/api/workspaces` CRUD | Integration | P1 |
| Workspace invitation flow | Integration | P1 |
| Public share view | E2E (Playwright) | P1 |
| Collab room join/leave | Unit | P2 |
| Note element CRUD | Unit | P2 |

**Action:**
1. Add `vitest` integration tests for the API routes using `msw` or `next-test-api-route-handler`
2. Add Playwright for E2E tests of the critical user flows
3. Add test coverage threshold to CI: fail if line coverage drops below 40% (gradually raise this)

---

### 5.3 ESLint configuration gaps — P2

Verify ESLint is configured with rules appropriate for production:
- `no-console` to prevent `console.log` in production code
- `@typescript-eslint/no-explicit-any` to reduce unsafe typing
- `react-hooks/exhaustive-deps` (should already be on)

**Action:** Review `apps/web/.eslintrc.*` and enable the above rules. Fix any resulting warnings.

---

### 5.4 No type safety on API contracts — P2

API routes accept and return untyped JSON. The `packages/ai-contracts` exists for AI tool schemas, but there are no shared Zod schemas for the main API request/response shapes.

**Action:**
1. Create `packages/api-contracts` (or extend `ai-contracts`) with Zod schemas for all API request bodies
2. Use these schemas to validate inputs in route handlers (catches malformed client requests)
3. Derive TypeScript types from the schemas for use in both frontend and backend

---

## 6. Infrastructure & Operations

### 6.1 No deployment environment separation — P0

There is no staging environment. All testing happens locally, and changes are deployed directly to production.

**Action:**
1. Create a `staging` branch that deploys to a Vercel preview environment
2. Configure a separate Neon database branch for staging
3. Use different Clerk application instances for staging vs production
4. Collab server: deploy a staging instance on Railway/Fly.io (see Deployment doc)

---

### 6.2 No health checks or uptime monitoring — P1

The collab server has a `/healthz` endpoint. The web app and MCP server do not.

**Action:**
1. Add `GET /api/health` to `apps/web` returning `{ ok: true, version: process.env.VERCEL_GIT_COMMIT_SHA }`
2. Add a health check to `apps/mcp` express server
3. Configure uptime monitoring: Betterstack, Checkly, or a simple UptimeRobot check on all three health endpoints
4. Alert on Slack/email when any endpoint is down for > 2 minutes

---

### 6.3 Collab server has no Docker or deployment config — P1

`apps/collab` has no `Dockerfile`, no `fly.toml`, no `railway.json`. The server cannot be deployed without manual configuration.

**Action:** Create `apps/collab/Dockerfile`:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY src/ ./src/
COPY tsconfig.json ./
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4001
CMD ["node", "dist/index.js"]
```

And create `apps/collab/fly.toml` for Fly.io deployment (see Deployment doc).

---

### 6.4 No cron jobs for expired data cleanup — P2

The following data accumulates indefinitely:
- `ShareSnapshot` records with past `expiresAt`
- `WorkspaceInvitation` records with `PENDING` status past `expiresAt`
- `CollabRoom` records with old `lastActiveAt`
- Vercel Blob objects for expired snapshots (orphaned if not deleted)

**Action:**
1. Add a Vercel Cron Job at `apps/web/app/api/cron/cleanup/route.ts`
2. Add to `vercel.json`: `{ "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 2 * * *" }] }`
3. The handler should:
   - Mark expired invitations as `EXPIRED`
   - Delete expired `ShareSnapshot` rows and their Vercel Blob objects
   - Archive collab rooms not active in 30 days
4. Protect the endpoint with a `CRON_SECRET` header check

---

### 6.5 No logging infrastructure — P2

The collab server uses `console.log`. The web app API routes have no structured logging. Without structured logs, debugging production issues is very difficult.

**Action:**
1. Add `pino` to `apps/collab` for structured JSON logging
2. For `apps/web`, use Vercel's built-in log drains (configurable in Vercel dashboard → project → Log Drains)
3. Drain logs to a service: Logtail (Betterstack), Papertrail, or Axiom
4. Add `requestId` correlation to API responses for trace debugging

---

## 7. Feature Completeness

### 7.1 Billing and subscription pages are placeholders — P1

`settings/subscription/billing/page.tsx` and `settings/subscription/manage-subscription/page.tsx` are "coming soon" stubs. Without billing, the app cannot charge users.

**Action:**
1. Decide: Stripe for payment processing (industry standard)
2. Integrate `stripe` SDK and `@stripe/stripe-js`
3. Implement: checkout session, customer portal, webhook handler for subscription events
4. Add `subscription` model to Prisma schema: `{ tier: FREE | PRO | TEAM, stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd }`
5. Gate AI features, collab rooms, and storage limits behind plan tiers
6. This is a significant engineering effort — scope as a separate sprint

---

### 7.2 Export/import jobs lack actual processing — P1

Job records are created in the database, but the actual export (serializing workspace scenes to a file) and import (parsing and hydrating scenes) logic may be incomplete.

**Action:**
1. Audit `apps/web/app/api/workspaces/[id]/export/route.ts` — verify it actually serializes all scenes and collections to a downloadable format (e.g., ZIP of `.excalidraw` files)
2. Verify the import route correctly parses the export format and creates scenes/collections
3. Add progress reporting: update job `status` from `PENDING → RUNNING → SUCCEEDED/FAILED`
4. Store the exported file in Vercel Blob and return a signed download URL
5. Send a notification (email or in-app) when the job completes

---

### 7.3 AI chat lacks workspace-level billing guard — P1

`OPENROUTER_API_KEY` is a shared key — any user in any workspace can make unlimited AI requests. There is a workspace-level `aiEnabled` flag, but no per-user or per-workspace usage limit.

**Action:**
1. Add a `WorkspaceAIUsage` model tracking monthly token usage per workspace
2. Implement a soft limit (warn at 80%) and hard limit (block at 100%) based on plan tier
3. Log every AI request with token counts from the OpenRouter response
4. Display usage in `settings/workspace/ai/page.tsx`

---

### 7.4 Invitation emails not implemented — P1

`WorkspaceInvitation` records are created with a `token`, but there is no code to send the invitation email to the invited user. The token exists but the user has no way to discover it unless told directly.

**Action:**
1. Add email sending via Resend or SendGrid
2. On invitation creation, send an email with `https://notedraw.com/invite/[token]`
3. Include the workspace name, inviter name, and expiry date in the email
4. Add a resend invitation button in the settings UI

---

### 7.5 Onboarding flow is minimal — P2

The onboarding page collects a workspace name but likely doesn't guide users through creating their first scene or understanding the note element feature.

**Action:**
1. Add an onboarding checklist: create first scene → use the AI assistant → share a scene
2. Show a guided tour or tooltip walkthrough on first entry to the editor
3. Pre-populate a sample scene with a note element to demonstrate the feature

---

### 7.6 MCP server integration not wired to web app — P2

`apps/mcp` is a standalone MCP server that can be used with Claude Desktop. However, the web app's AI chat (`/api/ai/scene-chat`) uses OpenRouter directly, not the MCP server. The two AI paths are disconnected.

**Action:**
1. Document clearly the two AI modes: (a) in-app AI chat via OpenRouter, (b) external MCP integration via Claude Desktop
2. If the intent is to unify them, wire the in-app AI to go through the MCP protocol
3. Add a "Connect to Claude Desktop" setup guide in the app's settings

---

## 8. Developer Experience

### 8.1 No `.env.example` for collab and MCP apps — P1

`apps/collab` and `apps/mcp` have no `.env.example` files. A new developer setting up the project has no way to know what environment variables these services need.

**Action:**
1. Create `apps/collab/.env.example`:
```
PORT=4001
COLLAB_ALLOWED_ORIGINS=http://localhost:3000
COLLAB_REDIS_URL=              # Optional: redis://localhost:6379
COLLAB_MAX_PAYLOAD_BYTES=1000000
```

2. Create `apps/mcp/.env.example`:
```
UPSTASH_REDIS_REST_URL=        # Optional: fallback to memory
UPSTASH_REDIS_REST_TOKEN=      # Optional
NOTEDRAW_SHARE_EXPORT_URL=     # Optional webhook
NOTEDRAW_SHARE_EXPORT_TOKEN=   # Optional
NODE_ENV=development
```

3. Update `apps/web/.env.example` to include `SYNC_FULL_SCENE_INTERVAL_MS=20000`

---

### 8.2 No local Docker Compose for development — P2

Setting up the development environment requires manually starting the web app, collab server, and MCP server, plus configuring a PostgreSQL database (Neon) and Redis. This makes onboarding new developers slow.

**Action:** Create `docker-compose.dev.yml` at the root:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: notedraw
      POSTGRES_USER: notedraw
      POSTGRES_PASSWORD: notedraw
    ports: ['5432:5432']
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
```

Update `apps/web/.env.local.example` with local Docker database URLs. Add a `dev:infra` script to start just the infrastructure.

---

### 8.3 Turbo remote cache not configured for team — P2

`turbo.json` has `remoteCache: { signature: true }` but no remote cache endpoint is configured. Without remote cache, every developer rebuilds all packages from scratch.

**Action:**
1. Set up Vercel Remote Cache (free for Vercel-hosted monorepos): `npx turbo login && npx turbo link`
2. Or self-host Turborepo remote cache on Vercel
3. Add `TURBO_TOKEN` and `TURBO_TEAM` to CI environment variables

---

### 8.4 pnpm lockfile should be committed and frozen — P2

Ensure `pnpm-lock.yaml` is committed and CI uses `--frozen-lockfile`. Already referenced above in CI setup, but worth calling out explicitly.

**Action:** Verify `pnpm install --frozen-lockfile` is used in CI and that `pnpm-lock.yaml` is not in `.gitignore`.

---

## 9. Accessibility & SEO

### 9.1 No page metadata on most routes — P2

Only the root page likely has metadata. Dashboard and editor routes lack `<title>` and OG tags.

**Action:**
1. Add `export const metadata: Metadata = { title: '...', description: '...' }` to all page files
2. For dynamic routes (e.g., `scene/[id]/page.tsx`), use `generateMetadata()` to include the scene title
3. The share page (`/share/[id]`) needs OG image support for link previews — use Next.js OG image generation (`@vercel/og`)

---

### 9.2 Canvas accessibility — P3

The Excalidraw canvas is not keyboard-navigable by screen reader users. This is a known limitation of canvas-based drawing tools.

**Action (future):** Add a text-based accessibility mode that lists all elements and their positions. This is a significant effort but matters for enterprise/education customers.

---

## 10. Pre-Launch Checklist

Before going live, verify each of the following:

- [ ] All P0 issues resolved
- [ ] All P1 issues resolved or explicitly deferred with documented rationale
- [ ] Production Clerk instance created (not test keys)
- [ ] Production Neon database provisioned and migrated
- [ ] Production Vercel Blob token configured
- [ ] All secrets rotated (no `.env.local` keys in production)
- [ ] Custom domain configured in Vercel (`notedraw.com`, `app.notedraw.com`)
- [ ] TLS certificate verified (automatic with Vercel)
- [ ] Collab server deployed and `NEXT_PUBLIC_COLLAB_SERVER_URL` updated to production URL
- [ ] Clerk webhook configured with production endpoint URL
- [ ] Sentry projects created and DSNs configured
- [ ] Uptime monitoring enabled for all three services
- [ ] CI/CD pipeline passing
- [ ] `pnpm build` completes with zero TypeScript errors
- [ ] Database migration baseline committed
- [ ] Cron jobs configured in `vercel.json`
- [ ] Privacy policy and terms of service pages added
- [ ] GDPR compliance reviewed (user data export, deletion)
- [ ] Load tested: simulate 100 concurrent editors + 20 collab sessions

---

## Appendix: Priority Summary

| # | Item | Priority | Effort |
|---|------|----------|--------|
| 1.1 | Fix TypeScript ignoreBuildErrors | P0 | Medium |
| 1.2 | Add security headers | P0 | Small |
| 1.3 | Fix collab CORS fallback | P0 | Trivial |
| 1.4 | Verify Clerk webhook signature | P1 | Small |
| 1.5 | API rate limiting | P1 | Medium |
| 2.1 | Migrate to Prisma Migrate | P0 | Medium |
| 2.2 | Scene JSON size limits | P1 | Small |
| 2.3 | Full-text search indexes | P1 | Small |
| 3.1 | Sentry error tracking | P0 | Small |
| 3.2 | Background job processor | P1 | Large |
| 3.3 | Graceful collab shutdown | P1 | Trivial |
| 3.4 | Scene save retry + local fallback | P1 | Medium |
| 5.1 | CI/CD pipeline (GitHub Actions) | P0 | Small |
| 5.2 | Test coverage | P1 | Large |
| 6.1 | Staging environment | P0 | Medium |
| 6.2 | Health checks + uptime monitoring | P1 | Small |
| 6.3 | Collab Docker + deploy config | P1 | Small |
| 6.4 | Cron cleanup jobs | P2 | Small |
| 7.1 | Billing (Stripe) | P1 | XLarge |
| 7.2 | Export/import job processing | P1 | Large |
| 7.3 | AI usage limits | P1 | Medium |
| 7.4 | Invitation emails (Resend) | P1 | Medium |
| 8.1 | .env.example for all apps | P1 | Trivial |
| 8.2 | Docker Compose for local dev | P2 | Small |
