# MCP Execution Plan

Status: Authoritative execution plan for a full MCP-powered Notedraw AI system (no deferred scope).

Last updated: 2026-02-14

## 1) Scope and Non-Negotiables

This plan delivers:

- Full Excalidraw MCP parity from the reviewed `grovebox/excalidraw-mcp` implementation.
- Full Notedraw integration for workspace-scoped scene editing from AI chat.
- Internal mode (Notedraw webapp): AI output is `scene_patch` events applied live to the existing canvas/session (no MCP App widget required in chat UI).
- External mode (Claude/other MCP clients): behavior must be functionally identical to `excalidraw-mcp` for `read_me` + `create_view` + MCP App preview/edit widget + checkpoint/save/restore/export flows.
- Full support for Notedraw note elements (`type: "note"` + `noteContent` BlockNote JSON).
- Full role/team/collection permission enforcement on every read/mutation path.
- Full production readiness: observability, rate limiting, resilience, tests, rollout, and rollback.

No "later" bucket is allowed. Anything listed here is required for GA.

## 2) Current Baseline (as of this plan)

### 2.1 Existing Notedraw AI path

- Chat UI/context:
  - `apps/web/components/ai/scene-ai-context.tsx`
  - `apps/web/components/ai/scene-chat-input.tsx`
  - `apps/web/components/ai/scene-chat-bubble.tsx`
  - `apps/web/app/dashboard/scene/[id]/SceneEditor.tsx`
- Current API:
  - `apps/web/app/api/scene-chat/route.ts`
- Current limitation:
  - Text-only stream, no tool execution, no scene mutation contract, no note-aware AI ops.

### 2.2 Existing scene + permissions + workspace model

- Schema and entities:
  - `apps/web/prisma/schema.prisma`
  - `Workspace`, `WorkspaceMember`, `Collection`, `Scene`, `Team`, `TeamMember`, `TeamCollection`
  - `CollabRoom`, `ShareSnapshot` remain scene-scoped
- Permission helpers:
  - `apps/web/lib/auth.ts`
  - `canAccessScene`, `canEditScene`, `canAccessCollection`, `canEditCollection`, role + team scoping
- Scene APIs:
  - `apps/web/app/api/scenes/route.ts`
  - `apps/web/app/api/scenes/[id]/route.ts`
- Collab/share APIs:
  - `apps/web/app/api/collab/rooms/route.ts`
  - `apps/web/app/api/collab/files/route.ts`
  - `apps/web/app/api/share/route.ts`
  - `apps/web/app/api/share/[id]/route.ts`

### 2.3 Existing note element behavior

- Note editor wrapper:
  - `apps/web/components/note/ExcalidrawWithNotes.tsx`
  - `apps/web/components/note/NoteEditor.tsx`
- Search indexing includes notes:
  - `apps/web/lib/scene-search.ts`
- Excalidraw fork supports note type:
  - `packages/element/src/types.ts`
  - `packages/element/src/newElement.ts`
  - `packages/excalidraw/data/restore.ts`
  - `packages/excalidraw/components/App.tsx`

## 3) Final Target Architecture

### 3.1 Runtime topology

- `apps/web` remains the product app and policy authority (auth, permissions, scene persistence).
- New dedicated MCP runtime app: `apps/mcp` (streamable HTTP + stdio + MCP App resource).
- Shared contract and scene mutation packages are added under `packages/*`.

### 3.2 Request/data flow (internal Notedraw AI)

1. User sends prompt from scene chat UI.
2. `apps/web` API authenticates user, resolves workspace/scene access, checks AI workspace toggle.
3. AI orchestrator in `apps/web` calls model with tools.
4. Tool calls are executed via MCP client against `apps/mcp` `/mcp`.
5. MCP tools return structured scene patch operations (including note ops).
6. `apps/web` validates and applies patches via shared `packages/scene-ops`.
7. SSE stream emits:
   - assistant text chunks
   - tool lifecycle events
   - scene patch events
8. Scene UI applies patches live through Excalidraw API and existing save/collab pipeline.

### 3.3 Request/data flow (external MCP clients)

1. External MCP client connects to `apps/mcp` `/mcp`.
2. `create_view` + MCP App resource render interactive widget.
3. Checkpoint/save/restore/export flows match Excalidraw MCP parity.
4. Notedraw-specific tools remain available but require signed context token for workspace-scoped operations.

### 3.4 Mode split (normative)

- Internal mode (Notedraw webapp): AI output is `scene_patch` events applied live to the existing canvas/session (no MCP App widget required in chat UI).
- External mode (Claude/other MCP clients): behavior must be functionally identical to `excalidraw-mcp` for `read_me` + `create_view` + MCP App preview/edit widget + checkpoint/save/restore/export flows.

### 3.5 External parity runtime anchors (exact source functions)

1. HTTP MCP ingress parity source: `excalidraw-mcp/src/main.ts` -> `startStreamableHTTPServer` with `app.all("/mcp", ...)` and `StreamableHTTPServerTransport`.
2. stdio parity source: `excalidraw-mcp/src/main.ts` -> `startStdioServer` + `--stdio` branch in `main`.
3. server construction parity source: `excalidraw-mcp/src/server.ts` -> `createServer` + `registerTools`.
4. Vercel/serverless parity source: `excalidraw-mcp/api/mcp.ts` -> `createMcpHandler` wrapper + `/api/*` to `/` path normalization.
5. MCP App preview/edit parity source: `excalidraw-mcp/src/mcp-app.tsx` -> `DiagramView` + `ExcalidrawApp` with `app.ontoolinputpartial`, `app.ontoolinput`, `app.ontoolresult`.
6. checkpoint/edit persistence parity source: `excalidraw-mcp/src/edit-context.ts` -> `onEditorChange` + `save_checkpoint` call + `updateModelContext`.

## 4) Monorepo Structure Changes (Exact)

## 4.1 New app: `apps/mcp`

Create:

```text
apps/mcp/
  package.json
  tsconfig.json
  tsconfig.server.json
  vite.config.ts
  vercel.json
  manifest.json
  README.md
  api/mcp.ts
  src/main.ts
  src/server.ts
  src/checkpoint-store.ts
  src/edit-context.ts
  src/mcp-app.html
  src/mcp-app.tsx
  src/global.css
  src/pencil-audio.ts
  src/sounds.ts
  src/vite-env.d.ts
  scripts/setup-bun.mjs
```

Implementation rule:

- Start by porting `grovebox/excalidraw-mcp` files 1:1.
- Then extend tool surface and security contracts for Notedraw.

### 4.1.1 Source-of-truth copy map (mandatory, no reinvention)

Execution order for Phase B:

1. Copy each file listed below from `excalidraw-mcp` into `apps/mcp` with minimal path/package-name edits only.
2. Keep symbol names and behavior identical for all Excalidraw parity scope.
3. Run parity tests for `read_me` + `create_view` + widget/edit/checkpoint/export.
4. Only after parity passes, add Notedraw-specific tools/auth/context gating.

Exact file-to-file copy map:

1. `apps/mcp/src/server.ts` <- `excalidraw-mcp/src/server.ts`
Keep first-pass symbols exactly: `MAX_INPUT_BYTES`, `DIST_DIR`, `RECALL_CHEAT_SHEET`, `registerTools(server, distDir, store)`, `createServer(store)`.
Keep first-pass tool/resource wiring exactly: `server.registerTool("read_me", ...)`, `registerAppTool("create_view", ...)`, `registerAppTool("export_to_excalidraw", ...)`, `registerAppTool("save_checkpoint", ...)`, `registerAppTool("read_checkpoint", ...)`, `registerAppResource(...)`.
Keep first-pass `create_view` behavior exactly: JSON parse guard, restore checkpoint merge, delete-id filtering, camera 4:3 hint, checkpoint generation/save, structured response `{ checkpointId }`.

2. `apps/mcp/src/checkpoint-store.ts` <- `excalidraw-mcp/src/checkpoint-store.ts`
Keep first-pass symbols exactly: `validateCheckpointId`, `CheckpointStore`, `FileCheckpointStore`, `MemoryCheckpointStore`, `RedisCheckpointStore`, `createVercelStore`.
Keep first-pass constraints exactly: checkpoint size limit, safe ID regex + length, file-path traversal guard, best-effort prune/eviction, Redis TTL behavior.

3. `apps/mcp/src/main.ts` <- `excalidraw-mcp/src/main.ts`
Keep first-pass symbols exactly: `startStreamableHTTPServer`, `startStdioServer`, `main`.
Keep first-pass transport behavior exactly: per-request server + `StreamableHTTPServerTransport` on `/mcp`, stdio mode via `--stdio`, graceful shutdown handlers.

4. `apps/mcp/api/mcp.ts` <- `excalidraw-mcp/api/mcp.ts`
Keep first-pass symbols exactly: `createMcpHandler` composition and exported `GET`/`POST`/`DELETE` handlers.
Keep first-pass path-compat behavior exactly: accept both `/mcp` and `/api/mcp` path shapes.

5. `apps/mcp/src/mcp-app.tsx` <- `excalidraw-mcp/src/mcp-app.tsx`
Keep first-pass helper functions exactly: `parsePartialElements`, `excludeIncompleteLastItem`, `convertRawElements`, `fixViewBox4x3`, `extractViewportAndElements`, `computeSceneBounds`, `sceneToSvgViewBox`.
Keep first-pass components exactly: `DiagramView`, `ExcalidrawApp`, `ShareButton`.
Keep first-pass host/app callbacks exactly: `app.ontoolinputpartial`, `app.ontoolinput`, `app.ontoolresult`, `app.onhostcontextchanged`, `app.requestDisplayMode`, `app.callServerTool({ name: "read_checkpoint" ... })`, `app.callServerTool({ name: "export_to_excalidraw" ... })`.
Keep first-pass rendering/interaction behavior exactly: partial-stream rendering, tail-item drop, morphdom updates, viewport interpolation, fullscreen entry/exit sync, persisted user edits by checkpoint key.

6. `apps/mcp/src/edit-context.ts` <- `excalidraw-mcp/src/edit-context.ts`
Keep first-pass symbols exactly: `setStorageKey`, `setCheckpointId`, `captureInitialElements`, `loadPersistedElements`, `getLatestEditedElements`, `onEditorChange`.
Keep first-pass model-sync behavior exactly: debounce diff computation, `app.callServerTool("save_checkpoint")`, `app.updateModelContext(...)` edit summary updates.

7. `apps/mcp/src/pencil-audio.ts` <- `excalidraw-mcp/src/pencil-audio.ts`
Keep first-pass symbols exactly: `initPencilAudio`, `playStroke`.
Keep first-pass behavior exactly: one-time decode/init, randomized stroke playback envelopes, autoplay-resume handling.

8. `apps/mcp/src/sounds.ts` <- `excalidraw-mcp/src/sounds.ts`
Keep first-pass symbol exactly: `PENCIL_STROKE_SOFT`.

9. `apps/mcp/src/global.css` <- `excalidraw-mcp/src/global.css`
Keep first-pass parity-critical styles exactly: Excalidraw CSS/font imports, fullscreen container behavior, toolbar/fullscreen button behavior, hidden Excalidraw chrome in preview mode, SVG animation rules, export modal styles.

10. `apps/mcp/src/mcp-app.html` <- `excalidraw-mcp/src/mcp-app.html`
Keep first-pass import map and entry loading exactly: React/ReactDOM/Excalidraw/morphdom CDN imports, module entry to `src/mcp-app.tsx`, stylesheet link to `src/global.css`.

11. `apps/mcp/vite.config.ts` <- `excalidraw-mcp/vite.config.ts`
Keep first-pass build contract exactly: required `INPUT` env, `viteSingleFile`, externalization of React/Excalidraw/morphdom, esm.sh path mapping, `outDir = "dist"`, `emptyOutDir = false`.

12. `apps/mcp/vercel.json` <- `excalidraw-mcp/vercel.json`
Keep first-pass rewrites/headers exactly: `/mcp`, `/sse`, `/message` rewrites to `/api/mcp`; permissive MCP CORS headers for external clients.

13. `apps/mcp/manifest.json` <- `excalidraw-mcp/manifest.json`
Keep first-pass package metadata shape exactly.
For initial external parity rollout, advertise only `read_me` and `create_view` in `tools` until signed Notedraw context-token mode is enabled.

14. `apps/mcp/package.json` <- `excalidraw-mcp/package.json`
Keep first-pass scripts and dependency set equivalent for parity runtime.
Keep first-pass build pipeline shape equivalent: Vite single-file app build + server build + executable entry output.

15. `apps/mcp/scripts/setup-bun.mjs` <- `excalidraw-mcp/scripts/setup-bun.mjs`
Keep first-pass optional Bun bootstrap behavior equivalent if retaining Bun-based build steps.
If Notedraw standardizes on pure `tsc`/Node build, explicitly remove this script and replace with equivalent deterministic build flow.

16. `apps/mcp/tsconfig.json` <- `excalidraw-mcp/tsconfig.json`
Keep first-pass widget/build compiler options equivalent to avoid JSX/module resolution drift.

17. `apps/mcp/tsconfig.server.json` <- `excalidraw-mcp/tsconfig.server.json`
Keep first-pass server compiler options equivalent for `src/server.ts` and `src/main.ts`.

18. `apps/mcp/src/vite-env.d.ts` <- `excalidraw-mcp/src/vite-env.d.ts`
Keep first-pass Vite type declarations equivalent.

### 4.1.2 Post-copy extension rule (Notedraw-specific changes only after parity)

After the 1:1 copy reaches parity:

1. Extend `apps/mcp/src/server.ts` with Notedraw tools (`get_scene`, `apply_scene_patch`, collection/workspace tools).
2. Add signed context-token gating to tool advertisement and execution policy.
3. Add Notedraw export path (`export_to_notedraw_share`) while retaining existing `export_to_excalidraw`.
4. Keep all Excalidraw parity symbols and behavior as a locked baseline; additive changes only.

### 4.2 New shared package: `packages/ai-contracts`

Create:

```text
packages/ai-contracts/
  package.json
  tsconfig.json
  src/index.ts
  src/chat.ts
  src/events.ts
  src/mcp-tools.ts
  src/permissions.ts
```

Required exports:

- `SceneChatRequestSchema`, `SceneChatResponseEventSchema`
- `ScenePatchSchema`, `ScenePatchOpSchema`
- `McpToolInputSchemaMap`, `McpToolOutputSchemaMap`
- `WorkspaceRoleSchema`, `PermissionErrorSchema`

### 4.3 New shared package: `packages/scene-ops`

Create:

```text
packages/scene-ops/
  package.json
  tsconfig.json
  src/index.ts
  src/types.ts
  src/validate.ts
  src/apply-patch.ts
  src/normalize.ts
  src/note-content.ts
  src/rebase.ts
  src/errors.ts
```

Required functions:

- `validateScenePatch(patch): ValidationResult`
- `applyScenePatch(scene, patch): ApplyResult`
- `normalizeSceneElements(elements): NormalizedElements`
- `createNoteContentFromText(text): string`
- `createNoteContentFromMarkdown(md): string`
- `extractPlainTextFromNoteContent(noteContent): string`
- `rebasePatchOnScene(baseScene, headScene, patch): RebasedPatch`

### 4.4 `apps/web` new AI orchestration modules

Create:

```text
apps/web/lib/ai/
  index.ts
  scene-chat-orchestrator.ts
  model-client.ts
  mcp-client.ts
  tool-executor.ts
  streaming.ts
  context-builder.ts
  rate-limit.ts
  audit-log.ts
```

Required functions:

- `orchestrateSceneChat(reqContext, requestBody): ReadableStream`
- `buildSceneAIContext(userId, workspaceId, sceneId): SceneAIContext`
- `executeToolCall(toolCall, ctx): ToolExecutionResult`
- `streamSceneChatEvents(controller, event): void`
- `logAIAction(workspaceId, actorUserId, action, metadata): Promise<void>`

### 4.5 `apps/web` route changes

Create:

```text
apps/web/app/api/ai/scene-chat/route.ts
apps/web/app/api/ai/scene-chat/types.ts
```

Modify:

- `apps/web/app/api/scene-chat/route.ts` (replace with compatibility proxy to new route).
- `apps/web/middleware.ts` (ensure new AI route auth handling policy is explicit).
- `apps/web/next.config.mjs` (if adding MCP rewrite/proxy routes).

### 4.6 `apps/web` UI integration changes

Modify:

- `apps/web/components/ai/scene-ai-context.tsx`
- `apps/web/components/ai/scene-chat-input.tsx`
- `apps/web/components/ai/scene-chat-bubble.tsx`
- `apps/web/app/dashboard/scene/[id]/SceneEditor.tsx`
- `apps/web/components/note/ExcalidrawWithNotes.tsx`

Add:

```text
apps/web/components/ai/scene-ai-events.ts
apps/web/components/ai/scene-patch-applier.ts
apps/web/components/ai/scene-chat-types.ts
```

Mandatory implementation note:

- Add explicit UI plumbing task to pass `workspaceId`/`sceneId` into scene AI context and request body.
- Internal chat UI path remains `scene_patch`-driven and does not embed MCP App widget.
- External widget path must preserve copied behavior from `excalidraw-mcp/src/mcp-app.tsx` (`DiagramView`, `ExcalidrawApp`) and `excalidraw-mcp/src/edit-context.ts` (`onEditorChange` flow).

## 5) MCP Tool Surface (Complete)

All tools below are mandatory for GA.

### 5.1 Model-visible tools

1. `read_me`
- Purpose: Returns full drawing format + constraints cheat-sheet.
- Input: none.
- Output: text.

2. `create_view`
- Purpose: Draw/stream Excalidraw element arrays, checkpointed.
- Input:
  - `elements: string` (JSON array string)
- Output:
  - `checkpointId: string`
  - text guidance for follow-up restore/delete edits
- Contract:
  - `create_view` must be registered as an MCP App tool with `_meta.ui.resourceUri` bound to the registered MCP App resource (`registerAppResource`) so host clients render the interactive preview widget.

3. `get_scene`
- Purpose: Fetch current scene state for authorized context.
- Input:
  - `sceneId: string`
  - `workspaceId: string`
- Output:
  - normalized scene payload (elements/appState/files/meta)

4. `apply_scene_patch`
- Purpose: Apply validated patch operations to a scene.
- Input:
  - `sceneId: string`
  - `workspaceId: string`
  - `patch: ScenePatch`
- Output:
  - applied patch summary + new scene version

5. `create_scene`
- Purpose: Create scene in workspace/collection.
- Input:
  - `workspaceId: string`
  - `collectionId?: string | null`
  - `title: string`
- Output:
  - `sceneId`

6. `search_workspace_scenes`
- Purpose: Search by title + searchText within workspace.
- Input:
  - `workspaceId: string`
  - `query: string`
  - `collectionId?: string`
- Output:
  - scene summaries

7. `create_collection`
- Purpose: Workspace collection CRUD entrypoint.
- Input:
  - `workspaceId`, `name`, `parentId?`
- Output:
  - collection summary

8. `rename_collection`
- Purpose: Rename collection.
- Input:
  - `collectionId`, `name`
- Output:
  - updated summary

9. `move_scene`
- Purpose: Move scene to collection/null.
- Input:
  - `sceneId`, `collectionId|null`
- Output:
  - updated scene summary

10. `list_workspace_members` (read-only)
- Purpose: Context/tooling for role-aware operations.
- Input:
  - `workspaceId`
- Output:
  - members + roles

### 5.2 App-visible tools (MCP widget/internal runtime only)

1. `save_checkpoint`
2. `read_checkpoint`
3. `export_to_excalidraw`
4. `export_to_notedraw_share`
5. `upload_scene_asset`

Visibility policy:

- These tools must be hidden from model-facing tool lists and only callable by app runtime (`_meta.ui.visibility: ["app"]` equivalent behavior).

### 5.3 Tool advertisement and partition policy (mandatory)

- Strict tool partition: external no-context clients only get Excalidraw parity tools; workspace mutation tools require signed Notedraw context token.
- For clients without a valid signed context token, advertise only `read_me` and `create_view`.
- For clients with a valid signed context token, advertise Notedraw workspace tools according to role policy.

### 5.4 Tool implementation anchors (copy exact server/widget functions first)

1. `read_me` baseline source: `excalidraw-mcp/src/server.ts` -> `RECALL_CHEAT_SHEET` constant + `server.registerTool("read_me", ...)`.
2. `create_view` baseline source: `excalidraw-mcp/src/server.ts` -> `registerAppTool("create_view", ...)` handler block.
3. `create_view` mandatory algorithm parity: restore lookup, delete filtering, 4:3 ratio hint, checkpoint generation/save, `structuredContent.checkpointId` response.
4. `export_to_excalidraw` baseline source: `excalidraw-mcp/src/server.ts` -> `registerAppTool("export_to_excalidraw", ...)` with server-side upload proxy flow.
5. `save_checkpoint` baseline source: `excalidraw-mcp/src/server.ts` -> `registerAppTool("save_checkpoint", ...)`.
6. `read_checkpoint` baseline source: `excalidraw-mcp/src/server.ts` -> `registerAppTool("read_checkpoint", ...)`.
7. App-only visibility baseline source: `excalidraw-mcp/src/server.ts` -> `_meta.ui.visibility: ["app"]` on app-private tools.
8. widget-to-tool call baseline source: `excalidraw-mcp/src/mcp-app.tsx` -> `app.callServerTool({ name: "read_checkpoint" ... })` and `app.callServerTool({ name: "export_to_excalidraw" ... })`.
9. edit-to-checkpoint baseline source: `excalidraw-mcp/src/edit-context.ts` -> `app.callServerTool({ name: "save_checkpoint" ... })`.
10. New Notedraw tools (`get_scene`, `apply_scene_patch`, etc.) are additive; they must not alter the existing control flow of the parity tools above.

## 6) Complete Endpoint Catalog

### 6.1 `apps/mcp` endpoints

1. `POST|GET|DELETE /mcp`
- Streamable MCP endpoint.
- Source copy anchor: `excalidraw-mcp/src/main.ts` -> `startStreamableHTTPServer` (`app.all("/mcp", ...)`, per-request server instance, `StreamableHTTPServerTransport`).
- Serverless copy anchor: `excalidraw-mcp/api/mcp.ts` -> `createMcpHandler` wrapper and `GET|POST|DELETE` export.

2. `POST /message` and `GET /sse` compatibility rewrites (if required by clients).
- Source copy anchor: `excalidraw-mcp/vercel.json` rewrite rules for `/mcp`, `/sse`, `/message`.

### 6.2 `apps/web` endpoints

1. `POST /api/ai/scene-chat`
- Auth required.
- Request body:
  - `workspaceId: string`
  - `sceneId: string`
  - `messages: { role, content }[]`
  - `mode: "chat" | "mutate"`
  - `allowMutations: boolean`
- Response:
  - `text/event-stream` with typed events from `packages/ai-contracts/src/events.ts`.

2. `POST /api/scene-chat`
- Compatibility proxy to `/api/ai/scene-chat` with deprecation header.

3. Existing scene/workspace APIs remain and become execution backend for authorized mutations:
- `/api/scenes`
- `/api/scenes/[id]`
- `/api/collections`
- `/api/collections/[id]`
- `/api/workspaces/[id]`
- `/api/workspaces/[id]/members`
- `/api/workspaces/[id]/teams`

### 6.3 External export auth and token exchange

- Auth/export rule: explicitly define how `export_to_notedraw_share` works for external MCP clients (token exchange or backend service auth), since current share API is Clerk-authenticated.
- This is mandatory before GA for external MCP integrations.
- Excalidraw parity anchor to preserve while adding this: `excalidraw-mcp/src/server.ts` -> `registerAppTool("export_to_excalidraw", ...)` flow remains unchanged and available.

## 7) Event Contracts (SSE from web AI route)

All events must be schema-validated and versioned.

```ts
type SceneChatEvent =
  | { type: "token"; content: string }
  | { type: "tool_start"; toolName: string; callId: string; input: unknown }
  | { type: "tool_result"; toolName: string; callId: string; output: unknown }
  | { type: "scene_patch"; patch: ScenePatch; sceneVersion: number }
  | { type: "warning"; message: string; code?: string }
  | { type: "error"; message: string; code: string; retryable: boolean }
  | { type: "done"; usage?: { inputTokens: number; outputTokens: number } };
```

UI behavior contract:

- `scene_patch` applies immediately.
- `tool_start`/`tool_result` are shown in bubble activity feed.
- `error` stops tool chain and preserves chat state.
- `done` closes stream and finalizes pending buffers.

## 8) Permission and Policy Enforcement (Mandatory)

### 8.1 Gates for every AI request

`apps/web/app/api/ai/scene-chat/route.ts` must enforce:

1. Authenticated user (`getCurrentUser`).
2. Scene access (`canAccessScene`).
3. Edit access for mutating mode (`canEditScene`).
4. Workspace AI toggle check (`workspace.aiEnabled`).
5. Team/collection scoping via existing helper chain.

### 8.2 Tool-level policy matrix

- `VIEWER`:
  - allowed: `read_me`, `get_scene`, search/list tools
  - denied: all mutation tools
- `MEMBER`:
  - allowed: scene + collection mutations within access scope
  - denied: workspace admin/member management tools
- `ADMIN`:
  - full workspace-level tool set

### 8.3 Required helper additions

Modify `apps/web/lib/auth.ts`:

- Add `canUseWorkspaceAI(userId, workspaceId): Promise<boolean>`
- Add `assertSceneMutationAccess(userId, sceneId): Promise<void>`
- Add `assertWorkspaceAdminAccess(userId, workspaceId): Promise<void>`

## 9) Notes Support Contract (Complete)

### 9.1 Accepted note input forms

- Plain text
- Markdown
- Pre-serialized BlockNote blocks

### 9.2 Canonical storage

- Always persist as JSON string in `noteContent` matching BlockNote block array.

### 9.3 Mandatory implementation points

- `packages/scene-ops/src/note-content.ts` is single conversion source.
- All tool mutations involving notes must route through this converter.
- `buildSceneSearchText` must keep indexing note content text.
- `ScenePreview` must still render notes correctly after AI mutations.

## 10) Excalidraw MCP Parity Matrix (Must match)

Feature parity required vs reviewed source (`grovebox/excalidraw-mcp`):

1. Transport parity anchors.
Source: `excalidraw-mcp/src/main.ts` -> `startStreamableHTTPServer`, `startStdioServer`, `main`.
Source: `excalidraw-mcp/api/mcp.ts` -> `createMcpHandler` wrapper with `/api/` path normalization.
Must match behavior: streamable `/mcp` lifecycle, per-request transport closure, stdio mode.

2. Server tool parity anchors.
Source: `excalidraw-mcp/src/server.ts` -> `registerTools`, `createServer`.
Must match symbols: `read_me`, `create_view`, `export_to_excalidraw`, `save_checkpoint`, `read_checkpoint`.
Must match `create_view` algorithm: parse guard, restore checkpoint merge, delete filtering, camera ratio hint, checkpoint save + structured checkpoint response.

3. Widget streaming/render parity anchors.
Source: `excalidraw-mcp/src/mcp-app.tsx` -> `parsePartialElements`, `excludeIncompleteLastItem`, `extractViewportAndElements`, `convertRawElements`, `computeSceneBounds`, `sceneToSvgViewBox`, `fixViewBox4x3`, `DiagramView`.
Must match behavior: partial JSON progressive rendering, incomplete-tail drop, morphdom diffing, viewport interpolation, 4:3 correction.

4. Fullscreen/edit sync parity anchors.
Source: `excalidraw-mcp/src/mcp-app.tsx` -> `toggleFullscreen`, `app.ontoolinputpartial`, `app.ontoolinput`, `app.ontoolresult`, `app.onhostcontextchanged`.
Source: `excalidraw-mcp/src/edit-context.ts` -> `setStorageKey`, `setCheckpointId`, `captureInitialElements`, `loadPersistedElements`, `getLatestEditedElements`, `onEditorChange`.
Must match behavior: fullscreen enter/exit sync, persisted local edits per checkpoint, checkpoint save on edit debounce, model-context diff update.

5. Resource registration/CSP parity anchors.
Source: `excalidraw-mcp/src/server.ts` -> `registerAppResource(...)` block and `_meta.ui.csp` + `prefersBorder` metadata.
Must match behavior: single shared resource URI for app tools, CSP domains for esm/font loading, border preference metadata.

6. Checkpoint storage reliability parity anchors.
Source: `excalidraw-mcp/src/checkpoint-store.ts` -> `validateCheckpointId`, `FileCheckpointStore`, `MemoryCheckpointStore`, `RedisCheckpointStore`, `createVercelStore`.
Must match behavior: checkpoint size limits, safe checkpoint IDs, filesystem path safety, memory eviction, Redis TTL.

7. Build/deploy/packaging parity anchors.
Source: `excalidraw-mcp/src/mcp-app.html`, `excalidraw-mcp/src/global.css`, `excalidraw-mcp/vite.config.ts`, `excalidraw-mcp/vercel.json`, `excalidraw-mcp/manifest.json`, `excalidraw-mcp/package.json`.
Must match behavior: single-file app build, external import map compatibility, rewrites/CORS for MCP clients, manifest tool visibility for external parity.

### 10.1 Parity lock (non-regression)

- Non-regression lock applies to all symbols listed in sections `3.5`, `4.1.1`, `5.4`, and `10`.
- Any change touching those symbols must include a parity regression test run proving no behavior drift.
- Explicit lock behaviors: partial parsing, tail-drop, morphdom diff, camera interpolation, fullscreen transitions, edit capture persistence, checkpoint restore/delete semantics, `export_to_excalidraw` success path.
- Rule for Notedraw extensions: additive changes only; never repurpose or re-sequence baseline Excalidraw parity control flow.

## 11) Detailed Phase Plan with File Operations

## Phase A - Contracts and shared packages

Create:

- `packages/ai-contracts/*`
- `packages/scene-ops/*`

Modify:

- root `package.json` scripts for workspace-wide build/typecheck if needed.
- `pnpm-workspace.yaml` (if new package path patterns are required).

Acceptance:

- `pnpm -r typecheck` passes for new packages.
- Contracts compile and are imported by both `apps/web` and `apps/mcp`.

## Phase B - MCP runtime bootstrap

Create:

- `apps/mcp/*` baseline from `grovebox/excalidraw-mcp`.

Mandatory copy-first sequence (exact):

1. Copy transport entrypoints: `excalidraw-mcp/src/main.ts` (`startStreamableHTTPServer`, `startStdioServer`) and `excalidraw-mcp/api/mcp.ts` (`createMcpHandler` wrapper).
2. Copy server/tool core: `excalidraw-mcp/src/server.ts` (`registerTools`, `createServer`, all five parity tools, resource registration).
3. Copy storage backends: `excalidraw-mcp/src/checkpoint-store.ts` (`CheckpointStore` implementations + `createVercelStore`).
4. Copy widget runtime: `excalidraw-mcp/src/mcp-app.tsx` (`DiagramView`, `ExcalidrawApp`, stream callbacks).
5. Copy widget edit/audio helpers: `excalidraw-mcp/src/edit-context.ts`, `excalidraw-mcp/src/pencil-audio.ts`, `excalidraw-mcp/src/sounds.ts`.
6. Copy static/build/deploy files: `excalidraw-mcp/src/mcp-app.html`, `excalidraw-mcp/src/global.css`, `excalidraw-mcp/vite.config.ts`, `excalidraw-mcp/vercel.json`, `excalidraw-mcp/manifest.json`, `excalidraw-mcp/package.json`, `excalidraw-mcp/tsconfig*.json`.
7. Only after steps 1-6 pass parity checks, add Notedraw tools/auth in `apps/mcp/src/server.ts`.

Modify:

- `apps/mcp/src/server.ts` with Notedraw tools and schema imports.
- `apps/mcp/src/checkpoint-store.ts` with prod Redis defaults.

Acceptance:

- `apps/mcp` runs locally in HTTP and stdio.
- `read_me` and `create_view` pass golden tests.
- `create_view` golden tests explicitly validate restore + delete + checkpointId response parity with copied `registerAppTool("create_view", ...)` logic.
- widget golden tests explicitly validate `app.ontoolinputpartial` streaming path + morphdom update + fullscreen edit persistence path.

## Phase C - Web AI route replacement

Create:

- `apps/web/app/api/ai/scene-chat/route.ts`
- `apps/web/lib/ai/*`

Modify:

- `apps/web/app/api/scene-chat/route.ts` -> compatibility proxy.

Acceptance:

- Auth + permission + AI toggle enforced.
- SSE event schema validated in runtime.

## Phase D - Scene mutation integration

Modify:

- `apps/web/components/ai/scene-ai-context.tsx`
- `apps/web/app/dashboard/scene/[id]/SceneEditor.tsx`
- `apps/web/components/ai/scene-chat-bubble.tsx`

Create:

- `apps/web/components/ai/scene-patch-applier.ts`
- `apps/web/components/ai/scene-ai-events.ts`

Acceptance:

- AI can add/edit/delete elements live in canvas.
- Changes go through save + collab flow without regressions.

## Phase E - Note operations + indexing

Modify:

- `apps/web/components/note/ExcalidrawWithNotes.tsx` (patch application hooks)
- `apps/web/lib/scene-search.ts` (ensure consistent note text extraction)

Create:

- tests in `packages/scene-ops/src/note-content.test.ts`

Acceptance:

- AI can create/update note blocks from text/markdown.
- Notes remain editable in existing UI and searchable.

## Phase F - Full hardening

Create:

- `apps/web/lib/ai/rate-limit.ts`
- `apps/web/lib/ai/audit-log.ts`

Modify:

- workspace activity log writes for AI tool actions.

Acceptance:

- rate limits, audit logs, and error taxonomy implemented.

## Phase G - External MCP + exports + polish

Modify:

- `apps/mcp/src/mcp-app.tsx` for Notedraw-specific export path.
- `apps/web/app/api/share/*` integration for `export_to_notedraw_share`.

Mandatory parity-preserving approach:

1. Keep `shareToExcalidraw` and `registerAppTool("export_to_excalidraw", ...)` unchanged as the external parity baseline.
2. Add `export_to_notedraw_share` as an additional app tool, not a replacement.
3. Reuse existing widget wiring style from `excalidraw-mcp/src/mcp-app.tsx` (`app.callServerTool(...)` from fullscreen UI action) for new Notedraw export.
4. Preserve existing `app.ontoolresult` checkpoint behavior while adding any Notedraw export status UI.

Acceptance:

- external MCP clients can render and export.
- internal Notedraw AI flow remains primary and stable.

## 12) Testing and Verification (Complete)

### 12.0 Acceptance suites

- Two acceptance suites: one for internal live patching, one for external Excalidraw MCP parity.
- Internal suite validates prompt -> `scene_patch` events -> live canvas mutation -> persisted reload parity.
- External suite validates `read_me`/`create_view` + MCP App preview/edit widget + checkpoint/save/restore/export parity.
- External suite must explicitly assert copied behavior for these source symbols:
`excalidraw-mcp/src/server.ts` -> `registerTools`, `create_view` handler, `export_to_excalidraw` handler.
`excalidraw-mcp/src/mcp-app.tsx` -> `parsePartialElements`, `excludeIncompleteLastItem`, `extractViewportAndElements`, `DiagramView`, `ExcalidrawApp`.
`excalidraw-mcp/src/edit-context.ts` -> `onEditorChange`.
`excalidraw-mcp/src/checkpoint-store.ts` -> `validateCheckpointId` and store backends.

### 12.1 Unit tests

Create:

- `packages/ai-contracts/src/*.test.ts`
- `packages/scene-ops/src/*.test.ts`
- `apps/web/lib/ai/*.test.ts`
- `apps/mcp/src/server.test.ts`

Coverage must include:

- patch validation/apply/rebase
- note conversion fidelity
- permission matrix outcomes
- checkpoint lifecycle
- SSE event parser/serializer
- parity helper behavior from copied widget/server modules:
`parsePartialElements`, `excludeIncompleteLastItem`, `convertRawElements`, `fixViewBox4x3`, `extractViewportAndElements`, `computeSceneBounds`, `sceneToSvgViewBox`, `validateCheckpointId`.

### 12.2 Integration tests

Create:

- `apps/web/app/api/ai/scene-chat/route.test.ts`
- `apps/web/app/api/scenes/*.integration.test.ts`
- `apps/mcp/api/mcp.integration.test.ts`

Must validate:

- role-based tool denial
- `aiEnabled = false` hard block
- collab leader/follower mutation behavior
- scene patch persistence correctness
- `/mcp` transport parity against copied `startStreamableHTTPServer` and `api/mcp.ts` path wrapper behavior.
- app-private tool visibility behavior (`save_checkpoint`, `read_checkpoint`, `export_to_excalidraw`) vs model-visible tool list behavior.

### 12.3 E2E tests

Create:

- `apps/web/e2e/ai-scene-mutate.spec.ts`
- `apps/web/e2e/ai-note-mutate.spec.ts`
- `apps/web/e2e/ai-collab.spec.ts`

Must validate:

- user prompt -> live canvas mutation -> saved scene reload parity
- note content created by AI is editable and persisted
- no permission escalation via AI
- external-host path: streamed `create_view` input -> inline preview -> fullscreen edit -> checkpoint restore -> export action.

### 12.4 Operational tests

- Load test streaming route with concurrent sessions.
- Chaos test checkpoint store fallback.
- Verify no memory leaks in long streams.

### 12.5 Golden parity fixtures (required)

1. Replay fixture through copied `create_view` path with progressive JSON chunks and assert preview state transitions match baseline behavior from `excalidraw-mcp/src/mcp-app.tsx`.
2. Replay restore/delete fixture and assert final element set matches baseline merge/filter logic from `excalidraw-mcp/src/server.ts` and `extractViewportAndElements`.
3. Replay fullscreen edit fixture and assert `save_checkpoint` + local persisted edits + model context diff behavior matches copied `excalidraw-mcp/src/edit-context.ts`.
4. Replay export fixture and assert `export_to_excalidraw` success/error pathways remain baseline-compatible while Notedraw export is additive.

## 13) Observability and Operations

### 13.1 Logging

Add structured logs with:

- `requestId`, `workspaceId`, `sceneId`, `userId`
- model name, latency, token usage
- tool call list + duration + outcome
- mutation count and op types
- external widget lifecycle logs mapped from copied `excalidraw-mcp/src/mcp-app.tsx` `fsLog`/`app.sendLog` path for fullscreen + export + checkpoint debugability.

### 13.2 Metrics

Track:

- stream success/failure rate
- tool failure rate by tool name
- patch apply failure rate
- permission denial counts
- average end-to-end latency

### 13.3 Alerts

Alert on:

- stream failure > threshold
- tool failure spike
- patch conflict spike
- checkpoint backend unavailability

## 14) Rollout Plan (Complete)

### 14.1 Flags

Add and enforce:

- `AI_MCP_ENABLED`
- `AI_MCP_MUTATIONS_ENABLED`
- `AI_MCP_EXTERNAL_ENABLED`

### 14.2 Staged rollout

1. Internal admin workspaces only.
2. 10% of workspaces.
3. 50% of workspaces.
4. 100% rollout.

At each stage:

- run predefined regression pack
- verify metrics + error budget
- verify rollback switch

### 14.3 Rollback

- Single switch disables MCP mutation mode and falls back to text-only assistant.
- Keep checkpoint and audit integrity on rollback.

## 15) Definition of Done

All items below must be true:

1. Excalidraw MCP parity features fully implemented in `apps/mcp`.
2. Notedraw AI chat can create/edit/delete scene elements and notes live.
3. Role/team/collection/workspace-AI policies are enforced in every AI request and tool call.
4. Collab/share/export remain functional with AI mutations.
5. Full typed contracts are shared and enforced.
6. Test suites (unit/integration/e2e) pass for new MCP + AI paths.
7. Observability and incident runbook are in place.
8. Rollout completed to 100% with acceptable SLOs.
9. All locked parity symbols/functions listed in `4.1.1` and `10` are present and behaviorally unchanged except additive Notedraw extensions.

## 16) Immediate First Implementation Commit Set

The first execution block (no feature shortcuts) is:

1. Add `packages/ai-contracts`.
2. Add `packages/scene-ops`.
3. Add `apps/mcp` baseline from `grovebox/excalidraw-mcp` using exact copy order in `4.1.1` (transport -> server -> store -> widget -> helpers -> static/build/deploy).
4. Add new `apps/web/app/api/ai/scene-chat/route.ts` with auth/permission/toggle enforcement.
5. Wire `SceneEditor` + `scene-ai-context` to scene-aware SSE event handling.

After that, continue through phases B -> G without skipping any section in this file.
