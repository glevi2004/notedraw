# Optimized Scene Saving Strategy

This document explains the optimized scene saving strategy implemented for NoteDraw, based on Excalidraw's approach for Firebase.

## Problem with Original Implementation

The original implementation saved every **2 seconds with debouncing**:

```typescript
// OLD - Too costly for database
const saveContent = useDebouncedCallback(async () => {
  // ... serialize and save to API
}, 2000);
```

**Problems:**
- 30 writes per minute of active editing
- Expensive for Neon database
- Saves even when nothing changed
- Debounce waits for idle, risking data loss

## Excalidraw's Firebase Strategy

Excalidraw uses a sophisticated approach:

### 1. Scene Version Tracking
```typescript
// Sum of all element versions creates a unique fingerprint
const getSceneVersion = (elements) => 
  elements.reduce((acc, el) => acc + el.version, 0);
```

- Only saves when version changes
- Prevents redundant saves
- Fast comparison (just sum numbers)

### 2. Throttled Saves (Not Debounced)
```typescript
// Excalidraw uses 20 second throttle
const queueSaveToFirebase = throttle(
  () => saveToFirebase(elements),
  SYNC_FULL_SCENE_INTERVAL_MS, // 20000ms
  { leading: false }
);
```

- **Throttle**: Saves periodically during active editing
- **Debounce**: Saves only after user stops
- Throttle ensures regular checkpoints

### 3. Version Cache
```typescript
class FirebaseSceneVersionCache {
  private static cache = new WeakMap<Socket, number>();
  
  static isSaved(socket, elements) {
    return this.cache.get(socket) === getSceneVersion(elements);
  }
}
```

- Tracks what's already saved
- Skips unnecessary API calls
- Per-room/session isolation

### 4. Before-Unload Protection
```typescript
window.addEventListener('beforeunload', () => {
  if (!isSavedToFirebase(elements)) {
    saveToFirebase(elements);
    preventUnload(event);
  }
});
```

- Saves when user tries to leave
- Shows browser's unsaved warning

## Our Implementation

### Key Constants

```typescript
const SAVE_THROTTLE_MS = 10000;      // Save at most every 10 seconds
const MIN_SAVE_INTERVAL_MS = 5000;   // Minimum 5 seconds between saves
```

**Why 10 seconds?**
- Excalidraw uses 20s for Firebase (very cheap)
- We use 10s for Neon (balance of cost vs safety)
- Adjustable based on your database costs

### Architecture

```
┌─────────────────┐
│  Excalidraw     │
│  onChange()     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Scene Version   │───► Compare with cache
│ Check           │     Skip if unchanged
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Throttled Save  │───► Wait 10s, trailing edge
│ (10s throttle)  │     Leading: false
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Min Interval    │───► Ensure 5s between saves
│ Check           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PATCH /api/     │───► Save to Neon
│ scenes/${id}    │
└─────────────────┘
```

### Usage

#### Option 1: Full Component (SceneEditor.tsx)

Full control with all features built-in:

```tsx
export function SceneEditor({ sceneId, title, initialContent }) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null);
  
  // ... setup refs and state
  
  const throttledSave = useMemo(() => 
    throttle(performSave, SAVE_THROTTLE_MS, { leading: false }),
    [performSave]
  );
  
  const handleChange = useCallback((elements) => {
    // Skip if scene unchanged
    if (SceneVersionCache.isSaved(sceneId, elements)) return;
    
    setIsDirty(true);
    throttledSave();
  }, [sceneId, throttledSave]);
  
  return <Excalidraw onChange={handleChange} ... />;
}
```

#### Option 2: Hook (useThrottledSceneSave)

Cleaner abstraction for reuse:

```tsx
export function SceneEditor({ sceneId, initialContent }) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null);
  
  const { isSaving, isDirty, handleChange, saveImmediately } = 
    useThrottledSceneSave(excalidrawRef, {
      sceneId,
      apiEndpoint: `/api/scenes/${sceneId}`,
      throttleMs: 10000,
    });
  
  return <Excalidraw onChange={handleChange} ... />;
}
```

## Cost Comparison

### Original (2s debounce)
| Scenario | Writes/Min | Writes/Hour | Cost Factor |
|----------|-----------|-------------|-------------|
| Active editing | 30 | 1,800 | **100%** |
| Idle | 0 | 0 | - |

### Optimized (10s throttle + version check)
| Scenario | Writes/Min | Writes/Hour | Cost Factor |
|----------|-----------|-------------|-------------|
| Active editing | 6 | 360 | **20%** |
| No changes | 0 | 0 | **0%** |
| Rapid changes | 6 | 360 | **20%** |

**Savings: ~80-100% reduction in database writes**

## Edge Cases Handled

### 1. Rapid Changes
```typescript
// Throttle prevents excessive saves
// Even if user draws rapidly, saves happen at most every 10s
const throttledSave = throttle(save, 10000, { leading: false });
```

### 2. No Changes
```typescript
// Version check skips save if nothing changed
if (SceneVersionCache.isSaved(sceneId, elements)) {
  return; // Skip API call
}
```

### 3. Tab Switch/Before Unload
```typescript
// Save when user switches tabs
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && isDirty) {
      immediateSave();
    }
  };
}, []);

// Save on beforeunload
window.addEventListener('beforeunload', () => {
  if (isDirty) immediateSave();
});
```

### 4. Scene Switching
```typescript
// Reset cache when scene changes
useEffect(() => {
  SceneVersionCache.clear(sceneId);
  throttledSave.cancel();
}, [sceneId]);
```

## Future Enhancements

### 1. WebSocket Collaboration
Like Excalidraw, add WebSocket for real-time collaboration:
- WebSocket for live cursor/element sync
- Database only for persistence (every 20-30s)
- Dramatically reduces DB load with multiple users

### 2. Compression
```typescript
// Compress before saving
import { compressData } from '@excalidraw/excalidraw/data/encode';

const compressed = await compressData(
  new TextEncoder().encode(JSON.stringify(content)),
  { encryptionKey: null }
);
```

### 3. Incremental Saves
Save only changed elements instead of full scene:
```typescript
const changedElements = elements.filter(el => 
  el.version > lastKnownVersions[el.id]
);
```

### 4. Offline Support
```typescript
// Queue saves when offline
const saveQueue = [];
window.addEventListener('online', () => {
  saveQueue.forEach(save => performSave(save));
});
```

## Files

- `/lib/scene-version.ts` - Scene version tracking
- `/lib/throttle.ts` - Throttle utility
- `/hooks/use-throttled-scene-save.ts` - Reusable hook
- `/app/dashboard/scene/[id]/SceneEditor.tsx` - Full implementation
- `/app/dashboard/scene/[id]/SceneEditorSimple.tsx` - Hook-based implementation

## References

- Excalidraw's [firebase.ts](https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/data/firebase.ts)
- Excalidraw's [Collab.tsx](https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/collab/Collab.tsx)
- Excalidraw's [app_constants.ts](https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/app_constants.ts)
