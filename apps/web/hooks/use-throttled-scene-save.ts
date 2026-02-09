"use client";

import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types";
import { throttle, type ThrottledFunction } from "@/lib/throttle";
import { getSceneVersion, SceneVersionCache } from "@/lib/scene-version";
import { SYNC_FULL_SCENE_INTERVAL_MS } from "@/app_constants";

export interface UseThrottledSceneSaveOptions {
  /** The scene/document ID */
  sceneId: string;
  /** API endpoint to save to (e.g., `/api/scenes/${sceneId}`) */
  apiEndpoint: string;
  /** Called when save succeeds */
  onSaveSuccess?: () => void;
  /** Called when save fails */
  onSaveError?: (error: Error) => void;
}

export interface UseThrottledSceneSaveReturn {
  /** Current save state */
  isSaving: boolean;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Last save error, if any */
  saveError: string | null;
  /** Last successful save time */
  lastSaved: Date | null;
  /** Handle Excalidraw onChange - pass this to Excalidraw's onChange prop */
  handleChange: (elements: readonly ExcalidrawElement[] | undefined) => void;
  /** Trigger immediate save (e.g., for manual save button) */
  saveImmediately: () => Promise<boolean>;
  /** Flush any pending save */
  flushPendingSave: () => void;
  /** Cancel any pending save */
  cancelPendingSave: () => void;
  /** Check if save is needed (scene changed since last save) */
  isSaveNeeded: (elements: readonly ExcalidrawElement[] | undefined) => boolean;
}

/**
 * Hook for optimized scene saving with throttling and version tracking
 * 
 * This implements the same pattern Excalidraw uses for Firebase:
 * 1. Scene version tracking to skip unnecessary saves
 * 2. Throttled saves (not debounced) for periodic checkpoints
 * 3. Immediate save on beforeunload / tab visibility change
 * 4. Proper cleanup and pending save handling
 * 
 * Uses SYNC_FULL_SCENE_INTERVAL_MS from app_constants (default 10s)
 * 
 * @example
 * ```tsx
 * const { 
 *   isSaving, 
 *   isDirty, 
 *   handleChange, 
 *   saveImmediately 
 * } = useThrottledSceneSave({
 *   sceneId: "my-scene",
 *   apiEndpoint: `/api/scenes/my-scene`,
 * });
 * 
 * <Excalidraw 
 *   onChange={handleChange}
 *   // ...
 * />
 * ```
 */
export function useThrottledSceneSave(
  excalidrawRef: React.RefObject<ExcalidrawImperativeAPI | null>,
  options: UseThrottledSceneSaveOptions,
): UseThrottledSceneSaveReturn {
  const {
    sceneId,
    apiEndpoint,
    onSaveSuccess,
    onSaveError,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const hasInitializedRef = useRef(false);
  const hasPendingSaveRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const throttledSaveRef = useRef<ThrottledFunction<() => Promise<void>> | null>(null);

  /**
   * Perform the actual save
   */
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!excalidrawRef.current || !hasInitializedRef.current) {
      return false;
    }

    const elements = excalidrawRef.current.getSceneElements();
    if (!elements || !Array.isArray(elements)) {
      return false;
    }

    // Check if actually changed
    if (SceneVersionCache.isSaved(sceneId, elements)) {
      setIsDirty(false);
      hasPendingSaveRef.current = false;
      return true;
    }

    try {
      const { serializeAsJSON } = await import("@excalidraw/excalidraw");

      const appState = excalidrawRef.current.getAppState();
      const files = excalidrawRef.current.getFiles();

      const serialized = serializeAsJSON(elements, appState, files, "database");
      const content = JSON.parse(serialized);

      setIsSaving(true);
      setSaveError(null);

      const response = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to save (${response.status}): ${errorBody}`);
      }

      // Update cache
      SceneVersionCache.set(sceneId, elements);
      lastSaveTimeRef.current = Date.now();
      hasPendingSaveRef.current = false;
      setIsDirty(false);
      setLastSaved(new Date());

      onSaveSuccess?.();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to save");
      setSaveError(error.message);
      onSaveError?.(error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawRef, sceneId, apiEndpoint, onSaveSuccess, onSaveError]);

  /**
   * Create throttled save function
   * Uses SYNC_FULL_SCENE_INTERVAL_MS from app_constants
   */
  const throttledSave = useMemo(
    () =>
      throttle(
        async () => {
          await performSave();
        },
        SYNC_FULL_SCENE_INTERVAL_MS,
        { leading: false, trailing: true },
      ),
    [performSave],
  );

  // Keep ref for cleanup
  throttledSaveRef.current = throttledSave;

  /**
   * Handle changes from Excalidraw
   */
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[] | undefined) => {
      // Guard against undefined/null elements
      if (!elements || !Array.isArray(elements)) {
        return;
      }

      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        // Initialize cache with initial elements
        SceneVersionCache.set(sceneId, elements);
        return;
      }

      if (SceneVersionCache.isSaved(sceneId, elements)) {
        setIsDirty(false);
        hasPendingSaveRef.current = false;
        return;
      }

      setIsDirty(true);
      hasPendingSaveRef.current = true;
      throttledSave();
    },
    [sceneId, throttledSave],
  );

  /**
   * Immediate save
   */
  const saveImmediately = useCallback(async (): Promise<boolean> => {
    throttledSave.flush();
    return performSave();
  }, [throttledSave, performSave]);

  /**
   * Check if save is needed
   */
  const isSaveNeeded = useCallback(
    (elements: readonly ExcalidrawElement[] | undefined): boolean => {
      if (!elements || !Array.isArray(elements)) return false;
      return !SceneVersionCache.isSaved(sceneId, elements);
    },
    [sceneId],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      throttledSaveRef.current?.cancel();
    };
  }, []);

  // Reset when sceneId changes
  useEffect(() => {
    hasInitializedRef.current = false;
    hasPendingSaveRef.current = false;
    lastSaveTimeRef.current = 0;
    setIsDirty(false);
    setSaveError(null);
    throttledSaveRef.current?.cancel();
  }, [sceneId]);

  return {
    isSaving,
    isDirty,
    saveError,
    lastSaved,
    handleChange,
    saveImmediately,
    flushPendingSave: throttledSave.flush,
    cancelPendingSave: throttledSave.cancel,
    isSaveNeeded,
  };
}
