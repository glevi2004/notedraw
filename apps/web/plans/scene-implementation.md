# Notedraw Scene & Drawing Implementation Plan

> Concrete plan for building an Excalidraw-inspired drawing system as packages in the `@grovebox/notedraw` monorepo, then consuming them in `apps/web/`.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Target Architecture](#2-target-architecture)
3. [Package Definitions](#3-package-definitions)
4. [Content Schema (Prisma `content Json?`)](#4-content-schema)
5. [Web App Integration](#5-web-app-integration)
6. [Implementation Phases](#6-implementation-phases)
7. [Key Patterns from Excalidraw](#7-key-patterns-from-excalidraw)

---

## 1. Current State

### Monorepo Infrastructure (ready)
- **Root**: `@grovebox/notedraw`, pnpm 10.24.0, Turbo 2.3
- **Workspace config** (`pnpm-workspace.yaml`): `["apps/*", "packages/*"]`
- **Turbo pipeline**: `build` depends on `^build`, outputs `dist/**` and `.next/**`
- **`packages/`**: Empty directory — ready for new packages

### Web App (`apps/web/` — `@grovebox/web`)
- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5.9.3
- **Auth**: Clerk (`@clerk/nextjs`)
- **Database**: Prisma 6.6 + PostgreSQL (Neon)
- **UI**: Tailwind CSS 3.4, shadcn/ui (Radix primitives), lucide-react icons
- **Drawing libs**: None installed yet

### Existing Scene Infrastructure
- **Prisma model**: `Scene { id, title, folderId?, content Json?, lastEditedBy?, lastEditedAt, createdAt, updatedAt }`
- **API routes**:
  - `GET /api/scenes` — list scenes (with folder access control)
  - `POST /api/scenes` — create scene `{ title, folderId?, content? }`
  - `GET /api/scenes/[id]` — get scene detail (includes `content`)
  - `PATCH /api/scenes/[id]` — update `{ title?, content? }` + sets lastEditedBy/At
  - `DELETE /api/scenes/[id]` — delete scene
- **Dashboard**: `DashboardClient.tsx` shows scene grid with create dialog; scenes show placeholder gradient (no thumbnails yet)
- **Routes**: `/` (landing), `/dashboard` (scene list), `/dashboard/sign-in`
- **Missing**: `/scene/[id]` editor page, drawing canvas, toolbar

---

## 2. Target Architecture

```
notedraw/
├── packages/
│   ├── math/              @notedraw/math       — Pure geometry & vector math
│   ├── common/            @notedraw/common     — Shared types, utils, constants
│   ├── element/           @notedraw/element    — Element types, Scene, Store, mutations
│   └── editor/            @notedraw/editor     — React canvas component + toolbar
│
└── apps/
    └── web/               @grovebox/web        — Next.js app consuming @notedraw/editor
        └── app/
            └── scene/[id]/page.tsx             — Editor page
```

### Dependency Graph

```
@notedraw/math      ← no internal deps
       ↑
@notedraw/common    ← depends on math
       ↑
@notedraw/element   ← depends on common, math
       ↑
@notedraw/editor    ← depends on element, common, math
       ↑                + roughjs, perfect-freehand, nanoid
@grovebox/web       ← depends on editor
```

---

## 3. Package Definitions

### 3.1 `@notedraw/math` — `packages/math/`

Pure math utilities. No DOM, no React. Can be used server-side.

#### `packages/math/package.json`
```json
{
  "name": "@notedraw/math",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "~5.9.3"
  }
}
```

#### Key Exports
```typescript
// src/index.ts
export type { Point, Vector, LineSegment, Bounds, Radians } from "./types"
export { pointFrom, pointDistance, pointTranslate, pointRotate, pointOnLineSegment } from "./point"
export { vectorFromTo, vectorAdd, vectorScale, vectorNormalize, vectorLength } from "./vector"
export { lineSegmentIntersection, lineSegmentLength } from "./lineSegment"
export { boundsFromPoints, boundsContainPoint, boundsIntersect, boundsCenter } from "./bounds"
export { clamp, degreesToRadians, radiansToDegrees } from "./utils"
```

#### Core Types
```typescript
// src/types.ts
export type Point = readonly [x: number, y: number]
export type Vector = readonly [x: number, y: number]
export type LineSegment = readonly [Point, Point]
export type Bounds = readonly [minX: number, minY: number, maxX: number, maxY: number]
export type Radians = number & { _brand: "radians" }
```

#### Files to Create
```
packages/math/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts
    ├── types.ts
    ├── point.ts          — Point operations (create, distance, translate, rotate)
    ├── vector.ts         — Vector operations (add, scale, normalize)
    ├── lineSegment.ts    — Line segment intersection, length
    ├── bounds.ts         — Bounding box operations (from points, containment, intersection)
    └── utils.ts          — clamp, angle conversions
```

---

### 3.2 `@notedraw/common` — `packages/common/`

Shared constants, color palette, utility functions, emitters.

#### `packages/common/package.json`
```json
{
  "name": "@notedraw/common",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@notedraw/math": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "~5.9.3"
  }
}
```

#### Key Exports
```typescript
// src/index.ts
export { COLOR_PALETTE, COLORS } from "./colors"
export { FONT_FAMILY, FONT_SIZES, DEFAULT_FONT_SIZE } from "./fonts"
export { DEFAULT_ELEMENT_PROPS } from "./defaults"
export { TOOL_TYPE } from "./tools"
export { Emitter } from "./emitter"
export { randomId, randomInteger, randomSeed } from "./random"
export { throttleRAF } from "./throttle"
export { isShallowEqual, arrayToMap } from "./utils"
export type { AppState, Zoom, ScrollState } from "./appState"
```

#### `AppState` — the non-element editor state
```typescript
// src/appState.ts
export interface Zoom {
  value: number // 1 = 100%
}

export interface ScrollState {
  scrollX: number
  scrollY: number
}

export interface AppState {
  // Tool state
  activeTool: ToolType

  // Viewport
  zoom: Zoom
  scroll: ScrollState
  width: number
  height: number

  // Selection
  selectedElementIds: Record<string, true>

  // Editing
  editingElementId: string | null

  // Style defaults (applied to new elements)
  currentStrokeColor: string
  currentBackgroundColor: string
  currentFillStyle: FillStyle
  currentStrokeWidth: number
  currentStrokeStyle: StrokeStyle
  currentRoughness: number
  currentOpacity: number
  currentFontSize: number
  currentFontFamily: FontFamily
  currentTextAlign: TextAlign

  // Canvas
  viewBackgroundColor: string
  gridSize: number | null

  // UI state
  showGrid: boolean
  theme: "light" | "dark"
}
```

#### Files to Create
```
packages/common/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts
    ├── colors.ts         — COLOR_PALETTE, default colors
    ├── fonts.ts          — Font family constants
    ├── defaults.ts       — DEFAULT_ELEMENT_PROPS
    ├── tools.ts          — TOOL_TYPE enum/union
    ├── appState.ts       — AppState, Zoom, ScrollState types
    ├── emitter.ts        — Emitter class (observer pattern)
    ├── random.ts         — randomId (nanoid-like), randomSeed
    ├── throttle.ts       — throttleRAF
    └── utils.ts          — isShallowEqual, arrayToMap, etc.
```

---

### 3.3 `@notedraw/element` — `packages/element/`

The core package. Element type system, Scene (source of truth), Store (change tracking), mutation, creation, collision detection, rendering helpers.

#### `packages/element/package.json`
```json
{
  "name": "@notedraw/element",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@notedraw/math": "workspace:*",
    "@notedraw/common": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "~5.9.3"
  }
}
```

#### Element Type System

```typescript
// src/types.ts — Based on Excalidraw's element types, simplified for v1

interface ElementBase {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  angle: number             // rotation in radians

  // Style
  strokeColor: string
  backgroundColor: string
  fillStyle: FillStyle       // "hachure" | "cross-hatch" | "solid"
  strokeWidth: number
  strokeStyle: StrokeStyle   // "solid" | "dashed" | "dotted"
  roughness: number          // 0 = architect, 1 = artist, 2 = cartoonist
  opacity: number            // 0-100
  roundness: { type: number; value?: number } | null

  // Metadata
  seed: number              // RoughJS seed for consistent hand-drawn look
  version: number           // Incremented on every mutation
  versionNonce: number      // Random, for conflict detection
  isDeleted: boolean        // Soft delete for undo

  // Grouping
  groupIds: string[]
  boundElements: { id: string; type: "text" | "arrow" }[] | null

  // Ordering
  index: string             // Fractional index for CRDT ordering
}

type ElementType =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "freedraw"
  | "text"
  | "image"

interface RectangleElement extends ElementBase { type: "rectangle" }
interface EllipseElement extends ElementBase { type: "ellipse" }
interface DiamondElement extends ElementBase { type: "diamond" }

interface LinearElement extends ElementBase {
  type: "line" | "arrow"
  points: readonly Point[]           // relative to (x,y)
  startBinding: Binding | null
  endBinding: Binding | null
  startArrowhead: Arrowhead | null
  endArrowhead: Arrowhead | null
}

interface FreeDrawElement extends ElementBase {
  type: "freedraw"
  points: readonly Point[]
  pressures: readonly number[]
  simulatePressure: boolean
}

interface TextElement extends ElementBase {
  type: "text"
  text: string
  fontSize: number
  fontFamily: FontFamily
  textAlign: TextAlign
  verticalAlign: VerticalAlign
  lineHeight: number
  containerId: string | null       // If bound inside a shape
  originalText: string
}

interface ImageElement extends ElementBase {
  type: "image"
  fileId: string                   // Reference to stored file
  status: "pending" | "saved" | "error"
  scale: [number, number]
}

type NotedrawElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LinearElement
  | FreeDrawElement
  | TextElement
  | ImageElement
```

#### Scene Class (source of truth for elements)
```typescript
// src/Scene.ts — Adapted from Excalidraw's Scene

class Scene {
  private elements: readonly NotedrawElement[] = []
  private elementsMap: Map<string, NotedrawElement> = new Map()
  private nonDeletedElements: readonly NotedrawElement[] = []
  private callbacks: Set<() => void> = new Set()
  private sceneNonce: number = 0

  getElements(): readonly NotedrawElement[]
  getElementsMap(): ReadonlyMap<string, NotedrawElement>
  getNonDeletedElements(): readonly NotedrawElement[]
  getElement(id: string): NotedrawElement | undefined
  getSceneNonce(): number

  replaceAllElements(elements: readonly NotedrawElement[]): void
  insertElement(element: NotedrawElement): void
  mutateElement(id: string, updates: Partial<NotedrawElement>): NotedrawElement

  onUpdate(callback: () => void): () => void  // Returns unsubscribe fn
  triggerUpdate(): void

  destroy(): void
}
```

#### Store Class (change tracking for undo/redo)
```typescript
// src/Store.ts — Simplified from Excalidraw's Store

enum CaptureUpdateAction {
  IMMEDIATELY,   // Capture for undo immediately (user actions)
  NEVER,         // Don't capture (programmatic changes)
  EVENTUALLY,    // Capture later (drag in progress)
}

interface StoreSnapshot {
  elements: Map<string, NotedrawElement>
  appState: Partial<AppState>  // Only observed subset
}

interface StoreDelta {
  added: Map<string, NotedrawElement>
  removed: Map<string, NotedrawElement>
  updated: Map<string, { from: Partial<NotedrawElement>; to: Partial<NotedrawElement> }>
}

class Store {
  onDurableIncrement: Emitter<StoreDelta>   // For history
  onEphemeralIncrement: Emitter<StoreDelta> // For collaboration

  commit(elements: ReadonlyMap<string, NotedrawElement>, appState: AppState): void
  shouldCaptureIncrement(): boolean
  scheduleAction(action: CaptureUpdateAction): void
}
```

#### Files to Create
```
packages/element/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts
    ├── types.ts            — All element type definitions
    ├── Scene.ts            — Scene class (element container, observer)
    ├── Store.ts            — Store class (change tracking, delta diffing)
    ├── newElement.ts       — Factory functions: newRectangle, newEllipse, newLine, newText, newFreeDraw
    ├── mutateElement.ts    — mutateElement (in-place + version bump), newElementWith (immutable)
    ├── bounds.ts           — getElementBounds, getCommonBounds (from element geometry)
    ├── collision.ts        — hitTest (point-in-element), getElementAtPosition
    ├── selection.ts        — getElementsInBounds (marquee), getSelectedElements
    ├── zindex.ts           — moveUp, moveDown, moveToFront, moveToBack (reorder by fractional index)
    ├── serialize.ts        — toJSON / fromJSON (for Prisma content field)
    └── shapeCache.ts       — WeakMap cache for RoughJS shapes (invalidate on mutation)
```

---

### 3.4 `@notedraw/editor` — `packages/editor/`

The React component package. This is what `apps/web/` imports.

#### `packages/editor/package.json`
```json
{
  "name": "@notedraw/editor",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --external react --external react-dom",
    "dev": "tsup src/index.ts --format esm,cjs --dts --external react --external react-dom --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@notedraw/math": "workspace:*",
    "@notedraw/common": "workspace:*",
    "@notedraw/element": "workspace:*",
    "roughjs": "^4.6.6",
    "perfect-freehand": "^1.2.2",
    "nanoid": "^5.0.0",
    "fractional-indexing": "^3.2.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tsup": "^8.0.0",
    "typescript": "~5.9.3"
  }
}
```

#### Main Export — `<NotedrawEditor>`
```typescript
// src/index.ts
export { NotedrawEditor } from "./NotedrawEditor"
export type { NotedrawEditorProps, NotedrawEditorRef } from "./NotedrawEditor"

// Re-export types consumers may need
export type { NotedrawElement, ElementType } from "@notedraw/element"
export type { AppState } from "@notedraw/common"
export { Scene, Store, CaptureUpdateAction } from "@notedraw/element"
```

#### `NotedrawEditor` Component Props
```typescript
// src/NotedrawEditor.tsx

interface NotedrawEditorProps {
  // Initial data (loaded from Prisma content JSON)
  initialElements?: readonly NotedrawElement[]
  initialAppState?: Partial<AppState>

  // Callbacks
  onChange?: (elements: readonly NotedrawElement[], appState: AppState) => void
  onSave?: (content: SceneContent) => void | Promise<void>

  // Config
  theme?: "light" | "dark"
  viewMode?: boolean          // Read-only mode
  gridMode?: boolean

  // Toolbar customization
  toolbarPosition?: "top" | "left"

  // Ref for imperative API
  ref?: React.Ref<NotedrawEditorRef>
}

interface NotedrawEditorRef {
  getElements(): readonly NotedrawElement[]
  getAppState(): AppState
  getSceneContent(): SceneContent    // Serialized for saving
  updateElements(elements: readonly NotedrawElement[]): void
  resetScene(): void
  undo(): void
  redo(): void
  zoomToFit(): void
}
```

#### Internal Architecture

```
NotedrawEditor (top-level component)
├── EditorProvider (React context: scene, store, appState, dispatch)
│
├── Toolbar
│   ├── ToolButtons (selection, rectangle, ellipse, diamond, line, arrow, freedraw, text, eraser)
│   ├── StyleControls (stroke color, fill, width, roughness, opacity)
│   ├── ActionButtons (undo, redo, zoom, grid toggle, export)
│   └── built with shadcn/ui Radix primitives already in @grovebox/web
│
├── CanvasContainer
│   ├── StaticCanvas (renders committed elements — throttled to RAF)
│   └── InteractiveCanvas (selection box, handles, in-progress drawing)
│
└── StatusBar (zoom level, element count)
```

#### Rendering Pipeline
```
Scene.triggerUpdate()
  → Renderer.getRenderableElements(scene, viewport)
    → filters isDeleted, clips to viewport bounds
  → StaticCanvas: for each visible element
    → ShapeCache.get(element) || generateRoughShape(element) → cache
    → drawElementOnCanvas(ctx, element, roughCanvas)
  → InteractiveCanvas: selection outlines, handles, snap guides
```

#### Two-Canvas Approach (simplified from Excalidraw's three)
- **StaticCanvas**: Renders all committed, non-deleted elements. Only redraws when `scene.sceneNonce` changes. Uses offscreen canvas caching per element via `ShapeCache` WeakMap.
- **InteractiveCanvas**: Renders on every frame (RAF). Shows selection rectangle, resize/rotate handles, in-progress element being drawn.

#### History (Undo/Redo)
```typescript
// src/History.ts
class History {
  private undoStack: StoreDelta[] = []
  private redoStack: StoreDelta[] = []

  record(delta: StoreDelta): void    // Push inverted delta to undo stack
  undo(scene: Scene, appState: AppState): { elements; appState } | null
  redo(scene: Scene, appState: AppState): { elements; appState } | null
  canUndo(): boolean
  canRedo(): boolean
}
```

#### Event Handler Architecture
```typescript
// src/handlers/ — Pointer event state machine

// Main handler dispatches based on activeTool:
handlePointerDown(event) → based on activeTool:
  "selection" → startSelection(event)       // Hit test → drag or marquee
  "rectangle" | "ellipse" | "diamond" → startShape(event)
  "line" | "arrow" → startLinear(event)
  "freedraw" → startFreeDraw(event)
  "text" → startText(event)
  "eraser" → startErase(event)

handlePointerMove(event) → based on active operation:
  dragging → updateDragPosition
  resizing → updateResize
  drawing shape → update width/height from drag
  drawing line → update points array
  freedraw → append point + pressure
  marquee → update selection rectangle

handlePointerUp(event) → finalize:
  Commit new element to Scene
  Store.scheduleAction(CaptureUpdateAction.IMMEDIATELY)
```

#### Files to Create
```
packages/editor/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts                        — Public exports
    ├── NotedrawEditor.tsx              — Top-level component
    ├── EditorProvider.tsx              — React context (scene, store, appState, dispatch)
    ├── hooks/
    │   ├── useScene.ts                 — Access scene from context
    │   ├── useAppState.ts              — Access/update appState
    │   └── useHistory.ts               — Undo/redo hooks
    ├── canvas/
    │   ├── StaticCanvas.tsx            — Element rendering canvas
    │   ├── InteractiveCanvas.tsx       — Selection/handles overlay canvas
    │   └── CanvasContainer.tsx         — Stacks both canvases, handles resize
    ├── renderer/
    │   ├── Renderer.ts                 — Memoized getRenderableElements (viewport culling)
    │   ├── renderElement.ts            — Draw single element on canvas (dispatches by type)
    │   ├── renderStaticScene.ts        — Full static scene render pass
    │   ├── renderInteractiveScene.ts   — Selection, handles, guides
    │   └── roughGenerator.ts           — RoughJS shape generation + WeakMap cache
    ├── handlers/
    │   ├── pointerHandlers.ts          — pointerDown/Move/Up state machine
    │   ├── keyboardHandlers.ts         — Shortcuts (delete, copy, paste, undo, redo, tool switch)
    │   ├── wheelHandler.ts             — Zoom + pan
    │   └── gestureHandlers.ts          — Pinch-to-zoom (mobile)
    ├── toolbar/
    │   ├── Toolbar.tsx                 — Tool selection bar
    │   ├── ToolButton.tsx              — Individual tool button
    │   ├── StylePanel.tsx              — Color/stroke/fill controls
    │   └── ZoomControls.tsx            — Zoom in/out/reset/fit
    ├── actions/
    │   ├── actionDeleteSelected.ts     — Delete selected elements
    │   ├── actionDuplicate.ts          — Duplicate selected
    │   ├── actionSelectAll.ts          — Select all
    │   ├── actionClipboard.ts          — Copy/cut/paste
    │   ├── actionHistory.ts            — Undo/redo
    │   ├── actionZorder.ts             — Bring to front, send to back
    │   └── actionAlign.ts              — Align/distribute selected
    ├── History.ts                      — Undo/redo stack
    └── utils/
        ├── cursor.ts                   — Cursor style per tool
        └── viewport.ts                 — Screen ↔ canvas coordinate transforms
```

---

## 4. Content Schema

The Prisma `Scene.content` field (`Json?`) stores the full scene state. This is what gets loaded/saved via the existing API routes.

### `SceneContent` Type (defined in `@notedraw/element`)

```typescript
// packages/element/src/serialize.ts

interface SceneContent {
  version: number                         // Schema version for migrations
  source: "notedraw"                      // Identifies origin
  elements: SerializedElement[]           // All elements (including soft-deleted for undo)
  appState: {                             // Persisted subset of AppState
    viewBackgroundColor: string
    gridSize: number | null
    zoom: number
    scrollX: number
    scrollY: number
  }
  files?: Record<string, FileData>        // Embedded images (base64 or reference)
}

// Serialization functions
function serializeScene(
  elements: readonly NotedrawElement[],
  appState: AppState,
  files?: Map<string, FileData>
): SceneContent

function deserializeScene(
  content: SceneContent
): { elements: NotedrawElement[]; appState: Partial<AppState> }
```

### How It Maps to Existing API

```typescript
// In apps/web — loading a scene:
const response = await fetch(`/api/scenes/${sceneId}`)
const scene = await response.json()
// scene.content is SceneContent | null

// In apps/web — saving a scene:
const content = editorRef.current.getSceneContent()  // Returns SceneContent
await fetch(`/api/scenes/${sceneId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content }),
})
```

### Version Migration
```typescript
// When loading, check content.version and migrate if needed:
function migrateContent(content: unknown): SceneContent {
  if (!content) return createEmptyScene()
  const parsed = content as SceneContent
  if (parsed.version === 1) return parsed
  // Future: migrate v1 → v2, etc.
  return parsed
}
```

---

## 5. Web App Integration

### 5.1 New Dependencies in `apps/web/package.json`

```json
{
  "dependencies": {
    "@notedraw/editor": "workspace:*"
  }
}
```

That's it. The editor package brings math, common, element as transitive deps. roughjs, perfect-freehand, nanoid, fractional-indexing come via the editor package.

### 5.2 New Route: `/scene/[id]`

```
apps/web/app/
├── scene/
│   └── [id]/
│       ├── page.tsx          — Server component: fetch scene, auth check, render client
│       └── SceneEditor.tsx   — Client component: wraps <NotedrawEditor>
```

#### `apps/web/app/scene/[id]/page.tsx`
```typescript
// Server Component — handles auth + data fetching
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getCurrentUser, canAccessFolder } from "@/lib/auth"
import { SceneEditor } from "./SceneEditor"

export default async function ScenePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) redirect("/dashboard/sign-in")

  const scene = await db.scene.findUnique({ where: { id } })

  if (!scene) redirect("/dashboard")

  // Check access
  if (scene.folderId) {
    const canAccess = await canAccessFolder(user.id, scene.folderId)
    if (!canAccess) redirect("/dashboard")
  }

  return (
    <SceneEditor
      sceneId={scene.id}
      title={scene.title}
      initialContent={scene.content}
    />
  )
}
```

#### `apps/web/app/scene/[id]/SceneEditor.tsx`
```typescript
"use client"

import { useRef, useCallback } from "react"
import { NotedrawEditor, type NotedrawEditorRef, type SceneContent } from "@notedraw/editor"
import { useTheme } from "@/context/ThemeContext"
import { useRouter } from "next/navigation"
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback"

interface SceneEditorProps {
  sceneId: string
  title: string
  initialContent: unknown  // Prisma Json type
}

export function SceneEditor({ sceneId, title, initialContent }: SceneEditorProps) {
  const editorRef = useRef<NotedrawEditorRef>(null)
  const { theme } = useTheme()
  const router = useRouter()

  // Parse initial content
  const parsed = initialContent
    ? deserializeScene(initialContent as SceneContent)
    : { elements: [], appState: {} }

  // Auto-save with debounce (save 2s after last change)
  const saveContent = useDebouncedCallback(async (content: SceneContent) => {
    await fetch(`/api/scenes/${sceneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  }, 2000)

  const handleChange = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getSceneContent()
      saveContent(content)
    }
  }, [saveContent])

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Title bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-muted-foreground">
          ← Back
        </button>
        <span className="text-sm font-medium">{title}</span>
        <div /> {/* Spacer */}
      </header>

      {/* Editor fills remaining space */}
      <div className="flex-1">
        <NotedrawEditor
          ref={editorRef}
          initialElements={parsed.elements}
          initialAppState={parsed.appState}
          onChange={handleChange}
          theme={theme}
        />
      </div>
    </div>
  )
}
```

### 5.3 Dashboard Scene Navigation

Update `DashboardClient.tsx` to navigate to the editor when clicking a scene card:

```typescript
// In the scene card click handler:
<div
  key={scene.id}
  onClick={() => router.push(`/scene/${scene.id}`)}
  className="group relative bg-card border ..."
>
```

### 5.4 "Start drawing" Flow

The existing "Start drawing" button creates a scene via `POST /api/scenes`, then should navigate to it:

```typescript
const handleCreateProject = async () => {
  // ... existing creation logic ...
  const newScene = await response.json()
  // Navigate to the new scene's editor
  router.push(`/scene/${newScene.id}`)
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (packages/math + packages/common)

**Goal**: Set up the two dependency-free packages. Get the monorepo build working.

1. Create `packages/math/` with all files (types, point, vector, bounds, utils)
2. Create `packages/common/` with types, constants, Emitter, utils
3. Add shared `tsconfig.base.json` at repo root for package tsconfigs to extend
4. Verify `pnpm build` from root builds both packages via turbo
5. Add `tsup` as a shared dev dependency or per-package

**Deliverables**: `@notedraw/math` and `@notedraw/common` build and typecheck cleanly.

---

### Phase 2: Element System (packages/element)

**Goal**: The data model and in-memory scene management.

1. Create element type definitions (`types.ts`)
2. Implement factory functions (`newElement.ts`) — `newRectangle()`, `newEllipse()`, `newDiamond()`, `newLine()`, `newArrow()`, `newFreeDraw()`, `newText()`
3. Implement `mutateElement()` — in-place mutation with version bump
4. Implement `Scene` class — element storage, observer pattern, `replaceAllElements()`, `insertElement()`, `mutateElement()`
5. Implement `Store` class — snapshot diffing, delta creation, `CaptureUpdateAction`
6. Implement `serialize.ts` — `SceneContent` type, `serializeScene()`, `deserializeScene()`, version migration
7. Implement hit testing (`collision.ts`) — point-in-rect, point-in-ellipse, point-near-line, point-in-freedraw
8. Implement bounds (`bounds.ts`) — `getElementBounds()` for each type
9. Implement selection helpers (`selection.ts`) — marquee selection, `getElementsInBounds()`
10. Implement z-index operations (`zindex.ts`) using fractional indexing

**Deliverables**: Full element data layer, serializable to/from JSON matching Prisma content field.

---

### Phase 3: Canvas Rendering (packages/editor — rendering only)

**Goal**: Static canvas that can render elements. No interaction yet.

1. Set up `packages/editor/` with React, roughjs, perfect-freehand
2. Implement `roughGenerator.ts` — generate RoughJS shapes from element data, WeakMap cache
3. Implement `renderElement.ts` — draw each element type:
   - Rectangle/Ellipse/Diamond → RoughJS `rectangle()`, `ellipse()`, `path()`
   - Line/Arrow → RoughJS `linearPath()` + arrowhead
   - FreeDraw → `perfect-freehand` → `getStroke()` → `Path2D`
   - Text → `ctx.fillText()` with font metrics
4. Implement `renderStaticScene.ts` — clear, apply zoom/scroll transform, iterate elements
5. Implement `StaticCanvas.tsx` — React component, canvas ref, `useEffect` to render
6. Implement viewport utilities (`viewport.ts`) — screen↔canvas coordinate transforms
7. Create minimal `NotedrawEditor.tsx` that renders `StaticCanvas` with hardcoded test elements

**Deliverables**: A React component that renders a set of elements on a canvas with zoom/pan.

---

### Phase 4: Interaction (packages/editor — pointer handlers)

**Goal**: Draw shapes, select, move, resize.

1. Implement `EditorProvider.tsx` — React context holding `Scene`, `Store`, `AppState`, dispatch
2. Implement pointer handler state machine (`pointerHandlers.ts`):
   - **Selection tool**: click to select (hit test), drag to move, shift-click multi-select, drag empty area for marquee
   - **Shape tools** (rect, ellipse, diamond): pointer down sets origin, drag sets width/height, pointer up commits element
   - **Line/Arrow tool**: click to add points, double-click to finish
   - **FreeDraw tool**: pointer down starts, move appends points + pressures, pointer up commits
   - **Text tool**: click to place text, open text editing input
3. Implement `InteractiveCanvas.tsx` — renders selection outlines, resize handles, in-progress element
4. Implement `CanvasContainer.tsx` — stacks StaticCanvas + InteractiveCanvas, passes pointer events
5. Implement `wheelHandler.ts` — zoom (ctrl+scroll) and pan (scroll)
6. Implement resize handles — 8-point resize + rotation handle on selected elements
7. Implement `keyboardHandlers.ts` — Delete/Backspace, Ctrl+A, arrow keys nudge, tool shortcuts (V, R, E, D, L, A, P, T)
8. Implement `cursor.ts` — change cursor based on active tool and hover state

**Deliverables**: Fully interactive drawing canvas. Can create, select, move, resize, delete elements.

---

### Phase 5: History, Toolbar, Actions

**Goal**: Undo/redo, visual toolbar, clipboard.

1. Implement `History.ts` — delta-based undo/redo stack
2. Wire Store → History: store emits `DurableIncrement` → history records
3. Implement `Toolbar.tsx` — tool buttons using lucide-react icons (already in web app)
4. Implement `StylePanel.tsx` — color picker, stroke width, fill style, opacity, roughness
5. Implement `ZoomControls.tsx` — zoom in/out/reset/fit
6. Implement clipboard actions (`actionClipboard.ts`) — copy (serialize selected → clipboard), paste (deserialize → new elements with new IDs)
7. Implement `actionDeleteSelected.ts`, `actionDuplicate.ts`, `actionSelectAll.ts`
8. Implement `actionZorder.ts` — bring to front, send to back
9. Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+C copy, Ctrl+V paste, Ctrl+D duplicate

**Deliverables**: Full editing experience with visual toolbar and undo/redo.

---

### Phase 6: Web App Integration

**Goal**: Editor page in the web app, auto-save, navigation.

1. Add `@notedraw/editor` as dependency in `apps/web/package.json`
2. Create `apps/web/app/scene/[id]/page.tsx` — server component with auth + data fetch
3. Create `apps/web/app/scene/[id]/SceneEditor.tsx` — client component wrapping `<NotedrawEditor>`
4. Implement debounced auto-save (PATCH `/api/scenes/[id]` with serialized content)
5. Update `DashboardClient.tsx`:
   - Scene card click → `router.push(/scene/${id})`
   - "Start drawing" button → create scene + navigate to editor
6. Add loading state and error handling for scene editor page
7. Test full flow: dashboard → create scene → draw → navigate back → reopen → data persists

**Deliverables**: End-to-end working flow from dashboard to drawing and back.

---

### Phase 7: Polish & Enhancements (future)

- **Scene thumbnails**: Generate PNG thumbnail on save, store as base64 or blob, display in dashboard grid
- **Image support**: File upload, store in blob storage, render on canvas
- **Export**: PNG/SVG export via offscreen canvas rendering
- **Collaboration prep**: WebSocket layer for real-time element sync (Store already emits deltas)
- **Mobile support**: Touch events, gesture handlers, responsive toolbar
- **Snap guides**: Alignment snapping during drag/resize
- **Grid snapping**: Snap to grid when grid is enabled
- **Text editing**: Inline contenteditable overlay for text elements
- **Element locking**: Prevent accidental edits
- **Keyboard shortcuts panel**: Help modal showing all shortcuts

---

## 7. Key Patterns from Excalidraw

These are architectural patterns to replicate, adapted for notedraw:

### 7.1 Scene as Single Source of Truth
- All element reads go through `Scene.getElements()` / `Scene.getElementsMap()`
- All mutations go through `Scene.mutateElement()` which auto-bumps version + triggers update
- Observer pattern via `Scene.onUpdate(callback)` — canvas subscribes to re-render

### 7.2 Version + Nonce for Cache Invalidation
- Every element has `version` (incremented) and `versionNonce` (random)
- ShapeCache keys off element reference, invalidates when version changes
- Scene has `sceneNonce` (random on every update) — canvases check this to know if re-render needed

### 7.3 Capture Update Action for History Control
- `IMMEDIATELY` — user just finished an action (created element, moved element, changed style) → record undo point
- `NEVER` — programmatic change (viewport pan, selection highlight) → no undo point
- `EVENTUALLY` — mid-drag → will become undo point when drag ends

### 7.4 Offscreen Canvas Caching
- Each element gets its own small offscreen canvas (via `ShapeCache` WeakMap)
- The rough shape is drawn once, then `ctx.drawImage(cachedCanvas)` on the main canvas
- Invalidated when element version changes (mutation detected)
- Saves expensive RoughJS re-computation on every frame

### 7.5 Fractional Indexing for Element Order
- Elements ordered by `index` field (string-based fractional index)
- Inserting between elements A and B generates index between A.index and B.index
- No need to update other elements — CRDT-friendly for future collaboration
- Uses `fractional-indexing` npm package

### 7.6 Delta-Based History
- Store compares before/after snapshots → produces `StoreDelta` (added/removed/updated elements)
- History stores inverted deltas — undo applies the inverse, redo applies forward
- This is more efficient than storing full snapshots and enables selective undo

### 7.7 Separated Static + Interactive Canvas
- Static canvas only redraws when elements change (Scene nonce check)
- Interactive canvas redraws on every RAF (selection, handles, in-progress drawing)
- Both canvases are absolutely positioned, stacked via CSS
- Pointer events go to the top (interactive) canvas

### 7.8 Coordinate System
```
Screen coordinates: (clientX, clientY) from mouse events
  → subtract canvas offset → canvas coordinates (0,0 at canvas top-left)
  → apply inverse zoom+scroll → scene coordinates (infinite canvas space)

Scene → Screen: (sceneX - scrollX) * zoom, (sceneY - scrollY) * zoom
Screen → Scene: screenX / zoom + scrollX, screenY / zoom + scrollY
```

---

## Summary

| Phase | Package | What | Depends On |
|-------|---------|------|------------|
| 1 | `@notedraw/math` | Geometry primitives | — |
| 1 | `@notedraw/common` | Types, constants, utils | math |
| 2 | `@notedraw/element` | Element types, Scene, Store, serialization | math, common |
| 3 | `@notedraw/editor` | Canvas rendering (static) | element + roughjs |
| 4 | `@notedraw/editor` | Pointer interaction, tools | Phase 3 |
| 5 | `@notedraw/editor` | History, toolbar, actions | Phase 4 |
| 6 | `@grovebox/web` | Scene page, auto-save, navigation | Phase 5 |
| 7 | All | Thumbnails, export, collaboration | Phase 6 |
