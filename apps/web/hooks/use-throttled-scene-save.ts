"use client";

import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import { throttle, type ThrottledFunction } from "@/lib/throttle";
import { SceneVersionCache } from "@/lib/scene-version";
import { SYNC_FULL_SCENE_INTERVAL_MS } from "@/app_constants";

/** localStorage key for persisting an unsaved payload across page reloads */
const localStorageKey = (sceneId: string) => `notedraw:unsaved:${sceneId}`;

/** Exponential backoff delays in ms for the two retry attempts */
const RETRY_DELAYS_MS = [1_000, 3_000];

export interface UseThrottledSceneSaveOptions {
  /** The scene/document ID */
  sceneId: string;
  /** API endpoint to save to (e.g., `/api/scenes/${sceneId}`) */
  apiEndpoint: string;
  /** Disable saving (e.g., during non-leader collaboration sessions) */
  enabled?: boolean;
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
  /**
   * True when a previous session stored an unsaved payload in localStorage for
   * this scene. The caller should surface a toast so the user knows their
   * most-recent changes were not synced to the server.
   */
  hasLocalFallback: boolean;
  /** Clear the localStorage fallback (call after displaying the warning) */
  clearLocalFallback: () => void;
  /** Handle Excalidraw onChange - pass this to Excalidraw's onChange prop */
  handleChange: (elements: readonly ExcalidrawElement[] | undefined) => void;
  /** Trigger immediate save (e.g., for manual save button) */
  saveImmediately: () => Promise<boolean>;
  /** Flush any pending save immediately */
  flushPendingSave: () => Promise<boolean>;
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
 * Uses SYNC_FULL_SCENE_INTERVAL_MS from app_constants (default 20s)
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
    enabled = true,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasLocalFallback, setHasLocalFallback] = useState(() => {
    // Detect on mount whether a previous session left an unsaved payload
    try {
      return !!localStorage.getItem(localStorageKey(sceneId));
    } catch {
      return false;
    }
  });

  const hasInitializedRef = useRef(false);
  const hasPendingSaveRef = useRef(false);
  const savingRef = useRef(false);
  const unloadTriggeredRef = useRef(false);
  const lastSavedPayloadRef = useRef<string | null>(null);
  const throttledSaveRef = useRef<ThrottledFunction<() => Promise<void>> | null>(null);
  const prevEnabledRef = useRef(enabled);

  /**
   * Perform the actual save
   */
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      return false;
    }
    if (savingRef.current) {
      return false;
    }
    if (!excalidrawRef.current || !hasInitializedRef.current) {
      return false;
    }

    const elements = excalidrawRef.current.getSceneElements();
    if (!elements || !Array.isArray(elements)) {
      return false;
    }

    // Check if actually changed
    if (
      !hasPendingSaveRef.current &&
      !isDirty &&
      SceneVersionCache.isSaved(sceneId, elements)
    ) {
      setIsDirty(false);
      hasPendingSaveRef.current = false;
      return true;
    }

    try {
      const { serializeAsJSON } = await import("@excalidraw/excalidraw");

      const appState = excalidrawRef.current.getAppState();
      const files = excalidrawRef.current.getFiles();

      const serialized = serializeAsJSON(elements, appState, files, "local");
      const content = JSON.parse(serialized);

      const payload = JSON.stringify({ content });
      if (payload === lastSavedPayloadRef.current) {
        setIsDirty(false);
        hasPendingSaveRef.current = false;
        return true;
      }
      savingRef.current = true;
      setIsSaving(true);
      setSaveError(null);

      let ok = false;

      // Try beacon only during unload-related flows
      if (unloadTriggeredRef.current) {
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function" &&
          payload.length <= 60 * 1024
        ) {
          const blob = new Blob([payload], { type: "application/json" });
          ok = navigator.sendBeacon(apiEndpoint, blob);
        }
      }

      if (!ok) {
        // Attempt the PATCH with up to RETRY_DELAYS_MS.length retries using
        // exponential backoff. After all retries are exhausted the payload is
        // written to localStorage so it can be recovered on the next page load.
        const attemptFetch = async (): Promise<Response> => {
          return fetch(apiEndpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
        };

        let response: Response | null = null;
        let lastErr: unknown = null;

        for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
          if (attempt > 0) {
            await new Promise<void>((resolve) =>
              setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]),
            );
          }
          try {
            response = await attemptFetch();
            if (response.ok) {
              lastErr = null;
              break;
            }
            // 4xx errors are definitive — don't retry
            if (response.status >= 400 && response.status < 500) break;
            lastErr = new Error(`HTTP ${response.status}`);
          } catch (err) {
            lastErr = err;
            response = null;
          }
        }

        if (!response?.ok) {
          // Persist payload to localStorage so the user doesn't lose work
          try {
            localStorage.setItem(localStorageKey(sceneId), payload);
          } catch {
            // Storage quota exceeded or private browsing — silently ignore
          }

          const errMessage =
            lastErr instanceof Error
              ? lastErr.message
              : response
                ? `Failed to save (${response.status})`
                : "Failed to save (network)";
          setSaveError(errMessage);
          console.error("[useThrottledSceneSave] save failed after retries", lastErr ?? response?.status);
          return false;
        }

        // Successful save — clear any stale localStorage fallback
        try {
          localStorage.removeItem(localStorageKey(sceneId));
        } catch {
          // ignore
        }

        // Replace local data: URLs with blob URLs returned by the server.
        // This prevents re-sending large base64 payloads on every subsequent
        // save and keeps the payload well under serverless body-size limits.
        try {
          const result = await response.json();
          if (result?.content?.files && excalidrawRef.current) {
            const localFiles = excalidrawRef.current.getFiles();
            const serverFiles = result.content.files as Record<string, any>;
            for (const [fileId, serverFile] of Object.entries(serverFiles)) {
              if (
                localFiles[fileId] &&
                serverFile?.dataURL &&
                /^https?:\/\//.test(serverFile.dataURL)
              ) {
                (localFiles[fileId] as any).dataURL = serverFile.dataURL;
              }
            }
          }
        } catch {
          // Response may not be JSON or may lack file data — ignore
        }
      }

      // Update cache
      SceneVersionCache.set(sceneId, elements);
      lastSavedPayloadRef.current = payload;
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
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [enabled, excalidrawRef, sceneId, apiEndpoint, onSaveSuccess, onSaveError]);

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

  // Keep ref for cleanup and cancel previous throttles on change
  useEffect(() => {
    throttledSaveRef.current = throttledSave;
    return () => {
      throttledSave.cancel();
    };
  }, [throttledSave]);

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
        // Initialize cache with initial elements but continue if there are changes
        SceneVersionCache.set(sceneId, elements);
        setIsDirty(false);
        hasPendingSaveRef.current = false;
        return; // skip hydration onChange; user edits will come next
      }

      if (SceneVersionCache.isSaved(sceneId, elements)) {
        setIsDirty(false);
        hasPendingSaveRef.current = false;
        return;
      }

      hasPendingSaveRef.current = true;
      if (!enabled) {
        return;
      }

      setIsDirty(true);
      throttledSave();
    },
    [enabled, sceneId, throttledSave],
  );

  /**
   * Immediate save
   */
  const saveImmediately = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      return false;
    }
    if (!hasPendingSaveRef.current && !isDirty) {
      return true;
    }
    throttledSave.flush();
    return performSave();
  }, [enabled, throttledSave, performSave, isDirty]);

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      return false;
    }
    if (!hasPendingSaveRef.current && !isDirty) {
      return true;
    }
    throttledSave.flush();
    return performSave();
  }, [enabled, throttledSave, performSave, isDirty]);

  const clearLocalFallback = useCallback(() => {
    try {
      localStorage.removeItem(localStorageKey(sceneId));
    } catch {
      // ignore
    }
    setHasLocalFallback(false);
  }, [sceneId]);

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
      // attempt to flush once on unmount; then cancel timers
      throttledSaveRef.current?.flush();
      throttledSaveRef.current?.cancel();
    };
  }, []);

  // Reset when sceneId changes
  useEffect(() => {
    hasInitializedRef.current = false;
    hasPendingSaveRef.current = false;
    setIsDirty(false);
    setSaveError(null);
    throttledSaveRef.current?.cancel();
    // Re-check localStorage fallback for the new scene
    try {
      setHasLocalFallback(!!localStorage.getItem(localStorageKey(sceneId)));
    } catch {
      setHasLocalFallback(false);
    }
  }, [sceneId]);

  useEffect(() => {
    if (prevEnabledRef.current === enabled) {
      return;
    }
    prevEnabledRef.current = enabled;

    if (!enabled) {
      throttledSaveRef.current?.cancel();
      if (isDirty) {
        hasPendingSaveRef.current = true;
      }
      setIsDirty(false);
      setSaveError(null);
      return;
    }

    if (hasPendingSaveRef.current) {
      void performSave();
    }
  }, [enabled, isDirty, performSave]);

  useEffect(() => {
    const onPageHide = () => {
      unloadTriggeredRef.current = true;
      if (hasPendingSaveRef.current || isDirty) {
        void saveImmediately();
      }
    };

    const onVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        (hasPendingSaveRef.current || isDirty)
      ) {
        unloadTriggeredRef.current = true;
        void saveImmediately();
      }
    };

    // Warn the user before navigating away with unsaved changes.
    // Modern browsers show a generic "Leave site?" dialog when this fires.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingSaveRef.current || isDirty) {
        e.preventDefault();
      }
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isDirty, saveImmediately]);

  return {
    isSaving,
    isDirty,
    saveError,
    lastSaved,
    hasLocalFallback,
    clearLocalFallback,
    handleChange,
    saveImmediately,
    flushPendingSave,
    cancelPendingSave: throttledSave.cancel,
    isSaveNeeded,
  };
}
