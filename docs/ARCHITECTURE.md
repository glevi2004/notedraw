# Notedraw — Architecture

> Last updated: February 2026

This document describes the full architecture of the Notedraw monorepo: all applications, shared packages, data flows, and key design decisions.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Repository Structure](#2-repository-structure)
3. [Applications](#3-applications)
   - [web (Next.js)](#31-web-nextjs)
   - [collab (Socket.IO)](#32-collab-socketio)
   - [mcp (Model Context Protocol)](#33-mcp-model-context-protocol)
4. [Shared Packages](#4-shared-packages)
5. [Data Model](#5-data-model)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Scene Saving & Sync](#7-scene-saving--sync)
8. [Real-time Collaboration](#8-real-time-collaboration)
9. [AI Integration](#9-ai-integration)
10. [File Storage](#10-file-storage)
11. [Key Design Decisions](#11-key-design-decisions)

---

## 1. System Overview

Notedraw is a collaborative whiteboard and note-taking application built on top of a custom fork of [Excalidraw](https://excalidraw.com). It adds:
- A rich-text **note element** type (using BlockNote) that can be placed on the canvas alongside drawings
- A **workspace model** for teams with role-based access control
- **Real-time collaboration** between multiple editors
- **AI-assisted scene editing** via both an in-app chat interface and an external MCP integration

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / Client                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Next.js Web App (apps/web)                       │   │
│  │  - Dashboard, editor, settings, sharing UI        │   │
│  │  - Excalidraw canvas with note element overlay    │   │
│  │  - Clerk auth session                             │   │
│  └──────────────┬───────────────────┬────────────────┘   │
└─────────────────│───────────────────│────────────────────┘
                  │ HTTPS             │ WebSocket
                  ▼                   ▼
   ┌──────────────────────┐  ┌──────────────────────┐
   │  Next.js API Routes  │  │  Collab Server        │
   │  (Vercel serverless) │  │  (Render web svc)     │
   │  - REST + SSE        │  │  Socket.IO            │
   │  - Prisma ORM        │  │  Real-time sync       │
   └──────────┬───────────┘  └──────────┬────────────┘
              │                          │ optional
              ▼                          ▼
   ┌──────────────────────┐  ┌──────────────────────┐
   │  Neon PostgreSQL     │  │  Redis               │
   │  (primary database)  │  │  (collab pub/sub)    │
   └──────────────────────┘  └──────────────────────┘

   ┌──────────────────────┐
   │  MCP Server          │
   │  (apps/mcp)          │
   │  Claude Desktop /    │
   │  external AI clients │
   └──────────────────────┘

   ┌──────────────────────┐
   │  Vercel Blob         │
   │  (file storage)      │
   │  - Images            │
   │  - Share snapshots   │
   │  - Export archives   │
   └──────────────────────┘

   ┌──────────────────────┐
   │  Clerk               │
   │  (authentication)    │
   │  - User sessions     │
   │  - Webhooks → DB     │
   └──────────────────────┘

   ┌──────────────────────┐
   │  OpenRouter          │
   │  (AI inference)      │
   │  - In-app AI chat    │
   └──────────────────────┘
```

---

## 2. Repository Structure

Notedraw is a **pnpm monorepo** managed with [Turborepo](https://turbo.build).

```
notedraw/
├── apps/
│   ├── web/              # Next.js 16 web application
│   ├── collab/           # Node.js Socket.IO collaboration server
│   └── mcp/              # MCP server (Excalidraw AI widget)
├── packages/
│   ├── excalidraw/       # Forked Excalidraw library (v0.18.0)
│   ├── element/          # Element types + custom note element
│   ├── common/           # Shared constants and color utilities
│   ├── math/             # 2D geometry, vectors, polygons
│   ├── utils/            # Export/import, compression, PNG helpers
│   ├── ai-contracts/     # Zod schemas for AI tool operations
│   └── scene-ops/        # Scene mutation helpers
├── turbo.json            # Turborepo pipeline config
├── pnpm-workspace.yaml   # Workspace packages declaration
└── tsconfig.base.json    # Shared TypeScript configuration
```

### Build System

Turborepo orchestrates the build pipeline. Tasks have explicit dependency ordering:

```
build → [dependsOn: "^build"]   (packages before apps)
lint  → [dependsOn: "^build"]   (built types needed)
typecheck → [dependsOn: "^build"]
```

Outputs are cached: `.next/**` and `dist/**`. Remote cache is configured for shared caching across developers and CI.

---

## 3. Applications

### 3.1 `web` (Next.js)

**Stack:** Next.js 16, React 19, TypeScript, TailwindCSS 3, shadcn/ui, Prisma 6

The primary application. Uses the **App Router** for all pages. Deployed to Vercel as a serverless Next.js application.

#### Directory layout

```
apps/web/
├── app/                  # App Router: pages, layouts, API routes
│   ├── api/              # REST API endpoint handlers
│   ├── dashboard/        # Authenticated app shell
│   │   └── scene/[id]/   # Scene editor
│   ├── landing/          # Marketing page
│   ├── onboarding/       # First-time user workspace creation
│   ├── invite/[token]/   # Workspace invitation accept
│   ├── share/[id]/       # Public read-only scene view
│   └── settings/         # Workspace + account settings
├── components/           # Shared React components
│   ├── ui/               # 56 shadcn/ui primitives
│   ├── note/             # Excalidraw + note overlay
│   ├── ai/               # AI chat UI
│   └── ...
├── sections/             # Landing page sections
├── lib/                  # Server-side utilities
│   ├── auth.ts           # Permission helpers
│   ├── db.ts             # Prisma client singleton
│   ├── scene-version.ts  # Scene fingerprint for save optimization
│   └── scene-search.ts   # Full-text search helpers
├── hooks/                # Client-side React hooks
├── prisma/
│   ├── schema.prisma     # Data model
│   └── seed.ts           # Dev seed data
└── generated/prisma/     # Prisma generated client (gitignored)
```

#### API Routes

All API routes are in `app/api/` and follow RESTful conventions:

| Route | Method(s) | Description |
|-------|-----------|-------------|
| `/api/webhooks/clerk` | POST | Sync Clerk user events to database |
| `/api/account/preferences` | PATCH | Update theme preference |
| `/api/workspaces` | GET, POST | List user workspaces, create workspace |
| `/api/workspaces/[id]` | GET, PATCH | Get/update workspace details |
| `/api/workspaces/[id]/invitations` | GET, POST | Manage invitations |
| `/api/workspaces/[id]/members` | GET, POST | Manage members |
| `/api/workspaces/[id]/teams` | GET, POST | Manage teams |
| `/api/workspaces/[id]/logo` | POST | Upload workspace logo to Vercel Blob |
| `/api/workspaces/[id]/export` | POST | Trigger export job |
| `/api/workspaces/[id]/import` | POST | Trigger import job |
| `/api/workspaces/[id]/logs` | GET | Fetch activity log |
| `/api/workspace-invitations/[token]/accept` | POST | Accept invitation |
| `/api/collections` | GET, POST | List/create collections |
| `/api/collections/[id]` | GET, PATCH, DELETE | Manage collection |
| `/api/scenes` | GET, POST | List/create scenes |
| `/api/scenes/[id]` | GET, PATCH, DELETE | Manage scene |
| `/api/collab/rooms` | GET, POST | Manage collab rooms |
| `/api/collab/files` | GET, POST | Upload/download collab assets |
| `/api/share` | GET, POST | Create share snapshots |
| `/api/share/[id]` | GET | Load public share snapshot |
| `/api/ai/scene-chat` | POST | AI scene chat (streaming SSE) |

#### Middleware

`middleware.ts` uses `clerkMiddleware` to protect all routes except:
- `/` (landing page)
- `/share/*` (public view)
- `/api/share/*` (public API)
- `/api/collab/files/*` (file access for shared collab)

Static assets, fonts, and next.js internals are excluded from middleware processing via the `matcher` config.

#### Scene Editor

The core editor (`app/dashboard/scene/[id]/SceneEditor.tsx`) composes:

```
SceneEditor
└── ExcalidrawWithNotes      ← custom wrapper (components/note/)
    ├── <Excalidraw>          ← forked canvas
    │   └── custom note element rendering
    └── <NoteEditor>          ← BlockNote overlay (rendered per note element)
```

Scene content is auto-saved with a **10-second throttle** (configurable via `SYNC_FULL_SCENE_INTERVAL_MS`). A version fingerprint (sum of element versions) prevents redundant API calls.

---

### 3.2 `collab` (Socket.IO)

**Stack:** Node.js, TypeScript (ESM), Socket.IO 4.8, ioredis, Zod

A dedicated long-lived WebSocket server for real-time collaboration. Deployed as a persistent Node.js process (not serverless), currently on Render.

#### Protocol

Clients connect and join rooms. The server relays messages between clients in the same room:

```
Client A joins room "abc"  →  Server: room "abc" = [A]
Client B joins room "abc"  →  Server: room "abc" = [A, B]
                                      Server emits "room-user-change" to room
Client A sends element delta  →  Server broadcasts to room (excluding A)
Client A sends volatile update  →  Server broadcasts volatile (cursor positions)
```

#### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join a collaboration room |
| `server-broadcast` | Client → Server | Reliable element update |
| `server-volatile-broadcast` | Client → Server | Cursor/pointer update (unreliable) |
| `room-user-change` | Server → Clients | Room participant list updated |
| `user-follow` | Client → Server | Start following another user's viewport |
| `user-follow-room-change` | Server → Clients | Notify of follow room change |

#### Rate Limiting

The server implements a simple token bucket per socket connection. Clients that exceed the limit have their message dropped (no disconnect).

#### Redis Adapter

When `COLLAB_REDIS_URL` is set, the server uses `@socket.io/redis-adapter` to publish/subscribe across multiple server instances. This enables horizontal scaling.

#### Health and Metrics

- `GET /healthz` — Returns `{"ok": true}` for load balancer health checks
- `GET /metrics` — Prometheus-format text metrics: `collab_connections`, `collab_messages`

---

### 3.3 `mcp` (Model Context Protocol)

**Stack:** Node.js (Bun/ESM), TypeScript, `@modelcontextprotocol/sdk`, Express 5, Vite, React 19 (server-side widget rendering), Redis (Render Key Value / Redis)

A standalone MCP server that exposes Notedraw's Excalidraw rendering capabilities to external AI clients (Claude Desktop, Claude.ai, ChatGPT with tool use).

#### Transport Modes

The MCP server supports two transports:

1. **HTTP Streamable** (`POST /mcp`) — Stateless request/response for web-based AI clients
2. **stdio** (`node dist/index.js --stdio`) — For Claude Desktop and local integrations

#### MCP Tools

| Tool | Description |
|------|-------------|
| `read_me` | Returns a usage cheat sheet for the AI model |
| `create_view` | Creates an interactive Excalidraw widget with streaming JSON |
| `export_to_excalidraw` | Exports the current diagram as a `.excalidraw` file |
| `save_checkpoint` | Persists diagram state to Redis with a short ID |
| `read_checkpoint` | Loads a previously saved diagram state |

#### Checkpoint System

Three-tier storage:
1. **Redis** (primary) — standard Redis URL (Render Key Value / Redis), 30-day TTL
2. **In-memory map** (fallback) — Used when Redis is unavailable / not configured
3. **File system** (development only) — Written to `tmp/checkpoints/`

#### Widget Rendering

The MCP widget (`mcp-app.tsx`) is a React component compiled to a **single-file HTML bundle** by Vite. It renders Excalidraw diagrams as SVG (not the full React canvas) for streaming compatibility. Features:
- Streaming JSON parse with `morphdom` for incremental DOM diffing
- CSS draw-on animations
- Fullscreen mode
- Auto-sizing with viewBox aspect ratio preservation

---

## 4. Shared Packages

All packages are consumed as raw TypeScript source (no separate build step) by `apps/web` via `transpilePackages` in Next.js config. The collab and MCP servers import them separately.

### `@excalidraw/excalidraw` (packages/excalidraw)

A fork of Excalidraw v0.18.0. Key modifications:
- Added `type: "note"` custom element type
- Elements with `type: "note"` store rich-text content in a `noteContent` property
- The canvas renderer handles note element layout (bounding box, selection handles)
- The overlay system (`ExcalidrawWithNotes`) renders a BlockNote editor positioned over the note element on the canvas

### `@excalidraw/element` (packages/element)

Element type definitions and factory functions. Extended with:
- `NoteElement` type extending `ExcalidrawElement`
- `noteContent: string` (serialized BlockNote JSON)

### `@excalidraw/common` (packages/common)

Shared constants (colors, key codes, etc.) and utilities from the upstream Excalidraw project. Minimal modifications.

### `@excalidraw/math` (packages/math)

2D geometry: vectors, polygons, line intersection, bounding box. Used by the renderer and collision detection.

### `@excalidraw/utils` (packages/utils)

Export/import helpers:
- `serializeAsJSON` — serialize scene to a string
- `loadFromBlob` — parse `.excalidraw` file
- Compression (pako) and PNG embedding utilities

### `@grovebox/ai-contracts` (packages/ai-contracts)

Zod schemas for AI tool operations. Shared between the web app's AI route and the MCP server:
- Scene element schemas
- Tool input/output contracts
- Safe serialization helpers

### `@grovebox/scene-ops` (packages/scene-ops)

High-level scene mutation operations validated against `ai-contracts` schemas:
- `addElement`, `updateElement`, `removeElement`
- `createNoteElement`
- Validation that mutations conform to the Excalidraw element schema

---

## 5. Data Model

See `apps/web/prisma/schema.prisma` for the complete schema. Below is the conceptual overview.

### Core Entities

```
Workspace (multi-tenant container)
  ├── WorkspaceMember[]  (User + Role)
  ├── Team[]
  │   ├── TeamMember[]   (WorkspaceMember + Role)
  │   └── TeamCollection[] → Collection
  ├── Collection[]       (hierarchical, self-referential)
  │   └── Scene[]
  ├── WorkspaceInvitation[]
  ├── WorkspaceActivityLog[]
  ├── WorkspaceExportJob[]
  └── WorkspaceImportJob[]

User (synced from Clerk)
  ├── UserPreference     (theme: SYSTEM | LIGHT | DARK)
  └── → WorkspaceMember (membership junction)

Scene
  ├── content: Json      (Excalidraw scene JSON)
  ├── searchText: Text   (plain text for search indexing)
  ├── CollabRoom[]
  └── ShareSnapshot[]

CollabRoom             (active collab session for a scene)
  └── UUID primary key, linked to sceneId

ShareSnapshot          (immutable public share of a scene)
  └── UUID primary key, blobPath → Vercel Blob
```

### Access Control Model

Workspace membership is the root of all access:

```
Can access workspace?
  → User must be a WorkspaceMember of the workspace

Can access collection?
  → Collection has no TeamCollection links: any workspace member can access
  → Collection has TeamCollection links: user must be in one of those teams

Can access scene?
  → Derived from parent collection access

Can edit scene?
  → User must be MEMBER or ADMIN (not VIEWER)

Can admin workspace?
  → User must be ADMIN role
```

All permission checks are in `apps/web/lib/auth.ts`.

---

## 6. Authentication & Authorization

### Clerk Integration

Authentication is handled entirely by [Clerk](https://clerk.com). The web app never stores passwords or handles session tokens directly.

**Flow:**

```
1. User signs in via Clerk (OAuth or email)
2. Clerk issues a session cookie/JWT
3. Clerk webhook fires → POST /api/webhooks/clerk
4. Handler creates or updates User record in DB (syncing clerkId, email, name, imageUrl)
5. On first login: onboarding page creates a default Workspace + ADMIN membership
6. Subsequent requests: clerkMiddleware validates session, `auth().userId` available in server context
```

**`lib/auth.ts` functions:**

| Function | Description |
|----------|-------------|
| `getCurrentUser()` | Reads Clerk session, returns DB User or null |
| `ensureUserExists()` | Like getCurrentUser but throws 401 if not authenticated |
| `resolveActiveWorkspaceId()` | Reads workspace ID from header or default |
| `canAccessWorkspace(userId, wsId)` | Checks WorkspaceMember exists |
| `canEditWorkspace(userId, wsId)` | Checks role is MEMBER or ADMIN |
| `canAdminWorkspace(userId, wsId)` | Checks role is ADMIN |
| `assertSceneMutationAccess(userId, sceneId)` | Throws 403 if user can't edit scene |
| `assertWorkspaceAdminAccess(userId, wsId)` | Throws 403 if user isn't admin |

---

## 7. Scene Saving & Sync

Scene content is saved to the database via a **10-second throttle** (not debounce). Saving is triggered by the Excalidraw `onChange` callback.

### Version Fingerprint

To avoid redundant API calls, a fingerprint of the scene is computed as:

```ts
const version = elements.reduce((sum, el) => sum + el.version, 0);
```

If the version hasn't changed since the last save, the API call is skipped. This is stored in a module-level `Map<sceneId, number>`.

### Save Flow

```
Excalidraw onChange
  → compute new version fingerprint
  → compare with cached version
  → if changed: schedule throttled save
  → throttled save fires (at most once per SYNC_FULL_SCENE_INTERVAL_MS)
  → PATCH /api/scenes/[id] with full scene JSON
  → update cached version
```

### Before-Unload Protection

When the user closes the tab or navigates away, a `beforeunload` handler fires and sends a **synchronous** save (using `sendBeacon` or a synchronous `fetch`).

### Cost Optimization

Scene content is typically 10–100 KB. With a 2-second debounce (naive approach), a 30-minute editing session would generate ~900 API calls. The 10-second throttle reduces this to ~180, an **80% reduction** in write amplification. At Neon's serverless pricing (cost per query), this is significant.

---

## 8. Real-time Collaboration

### Session Lifecycle

```
1. User opens a scene with an active CollabRoom
2. Client connects to collab server WebSocket
3. Client emits "join-room" with the room ID
4. Server adds socket to the Socket.IO room
5. Server emits "room-user-change" to all participants
6. User moves cursor → "server-volatile-broadcast" (not stored)
7. User modifies element → "server-broadcast" (stored in element delta, persisted by whoever leads)
8. Client disconnects → server emits "room-user-change"
```

### Room Leader

One participant is designated the "leader" (`roomLeaders` map on the server). The leader is responsible for writing the authoritative scene state to the database. If the leader leaves, leadership is transferred to the next connected participant.

### File Uploads

During collaboration, when a user adds an image to the canvas, the image is uploaded to Vercel Blob via `POST /api/collab/files`. All collaborators can then fetch the image via `GET /api/collab/files` (this route is public, allowing collab sessions to share assets).

---

## 9. AI Integration

### In-App AI Chat (OpenRouter)

The in-app AI assistant uses OpenRouter as the LLM provider. The flow:

```
1. User types a message in the chat input
2. Client POSTs to POST /api/ai/scene-chat
3. Route handler streams response via Server-Sent Events (SSE)
4. LLM response includes structured tool calls (add/update/remove elements)
5. Tool calls are parsed on the client and applied to the Excalidraw scene
6. Scene patches are rendered live as the AI streams
```

The AI can:
- Add new elements (shapes, text, note elements)
- Modify existing elements (change color, position, size)
- Create note elements with rich text content
- Understand the current scene context (element list passed in the prompt)

### External MCP Integration (Claude Desktop)

The `apps/mcp` server exposes Excalidraw capabilities as MCP tools. An external AI client (Claude Desktop, Claude.ai) can:

1. Call `create_view` with Excalidraw JSON → renders an interactive SVG widget
2. Call `save_checkpoint` → saves diagram state for cross-conversation persistence
3. Call `read_checkpoint` → loads a saved diagram
4. Call `export_to_excalidraw` → downloads a `.excalidraw` file

This path does **not** require a Notedraw account. It is a standalone MCP tool.

### Workspace AI Toggle

Each workspace has an `aiEnabled` boolean. When disabled, the AI chat interface is hidden and `/api/ai/scene-chat` returns 403 for that workspace's users.

---

## 10. File Storage

Vercel Blob is used for all file storage:

| Use case | Access level | Location |
|----------|-------------|---------|
| Workspace logos | Public (direct URL) | `workspaces/{workspaceId}/logo.*` |
| Collab session assets (images) | Public | `collab/{roomId}/{fileId}` |
| Share snapshots (scene JSON) | Public (by URL) | `share/{snapshotId}.json` |
| Export archives | Private (signed URL) | `exports/{jobId}.zip` |

**BLOB_READ_WRITE_TOKEN** is used server-side for all upload/delete operations. Clients receive direct public URLs for reading (no proxying needed).

---

## 11. Key Design Decisions

### Why fork Excalidraw?

The note element (`type: "note"`) required changes to Excalidraw's core element type system, the renderer, and the serialization format. These changes were too intrusive to maintain as a runtime plugin. Forking gives full control over the element type system without waiting for upstream acceptance.

**Trade-off:** The fork must be periodically rebased against upstream Excalidraw to pick up bug fixes and improvements. This is a maintenance burden.

### Why workspace-scoped multi-tenancy?

Rather than a simple per-user model, Notedraw uses workspaces as the unit of organization. This allows:
- Team collaboration with role-based access
- Collections and team scoping for fine-grained permissions
- A clear billing boundary (subscription per workspace)
- Easy migration path to enterprise-grade features

### Why a separate collab server?

Vercel serverless functions cannot maintain persistent WebSocket connections. A separate long-lived Node.js process (currently deployed on Render) is required. The collab server is intentionally kept minimal — it only relays messages and does not write to the database.

### Why Socket.IO over raw WebSocket?

Socket.IO provides:
- Automatic reconnection with exponential backoff
- Room abstraction
- Redis pub/sub adapter for horizontal scaling
- Fallback to long-polling in restricted network environments
- Namespace support for future feature isolation

### Why Neon (serverless PostgreSQL)?

Neon provides:
- Connection pooling compatible with Vercel's serverless model
- Database branching for staging/development environments
- Scale-to-zero for cost efficiency at low traffic
- Standard PostgreSQL — no lock-in beyond connection strings

### Why pnpm + Turborepo?

pnpm workspace protocol (`workspace:*`) is used for all local package references, ensuring consistent versioning. Turborepo provides:
- Incremental builds (only rebuild what changed)
- Remote caching for CI speed
- Parallel task execution
- Clear dependency graph between build tasks

### Why not use Next.js for the collab server?

Next.js API routes are stateless and serverless. Persistent WebSocket connections require a stateful process. Running the collab server inside Next.js would require a custom server (`server.ts`), which:
- Breaks Vercel deployment
- Complicates the build process
- Mixes concerns (HTTP API vs WebSocket relay)

### Why BlockNote for the note editor?

BlockNote provides:
- A mature, production-ready rich text editor built on ProseMirror
- A structured JSON document format (not raw HTML)
- Good React integration
- Collaborative editing support (future)
- Reasonable bundle size

**Trade-off:** BlockNote adds ~200 KB to the bundle. It is only loaded when a note element is on screen (via dynamic import).

### TypeScript `ignoreBuildErrors`

`apps/web/next.config.mjs` sets `typescript: { ignoreBuildErrors: true }`. This was added to accommodate pre-existing type errors in the Excalidraw fork packages that are not harmful at runtime. This is a **known technical debt** that must be resolved before production (see Production Readiness plan).
