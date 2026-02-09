"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types";
import { useTheme } from "@/context/ThemeContext";
import { Loader2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useSidebar } from "@/app/dashboard/components/SidebarContext";
import { throttle } from "@/lib/throttle";
import { getSceneVersion, SceneVersionCache } from "@/lib/scene-version";
import { SYNC_FULL_SCENE_INTERVAL_MS } from "@/app_constants";

// Dynamically import Excalidraw components to avoid SSR issues
const ExcalidrawWithNotes = dynamic(
  async () => {
    const mod = await import("@/components/note");
    return { default: mod.ExcalidrawWithNotes };
  },
  { ssr: false },
);

interface SceneEditorProps {
  sceneId: string;
  title: string;
  initialContent: unknown;
}

/**
 * SceneEditor with Excalidraw-style throttled saving
 * 
 * Based on Excalidraw's Firebase implementation:
 * - Uses scene version tracking to skip redundant saves
 * - Throttled saves (not debounced) for periodic checkpoints
 * - Immediate save on beforeunload
 * - No delay when leaving - saves are instant on exit
 */
export function SceneEditor({
  sceneId,
  title,
  initialContent,
}: SceneEditorProps) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const { theme } = useTheme();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Track when Excalidraw has finished loading
  const hasInitializedRef = useRef(false);
  // Track pending save (unsaved changes)
  const hasPendingSaveRef = useRef(false);
  // Track last successful save time
  const lastSaveTimeRef = useRef<number>(0);

  // Parse initial content
  const initialData = useMemo(() => {
    console.log("[SceneEditor] Raw initialContent:", initialContent);

    if (!initialContent || initialContent === null) {
      console.log("[SceneEditor] No initial content, starting with empty scene");
      return { elements: [], appState: {}, files: {} };
    }

    try {
      let content = initialContent as any;

      // Handle string (if Prisma returns it as string)
      if (typeof content === "string") {
        try {
          content = JSON.parse(content);
        } catch (e) {
          console.warn("[SceneEditor] Failed to parse content string:", e);
          return { elements: [], appState: {}, files: {} };
        }
      }

      // Handle empty object
      if (typeof content === "object" && Object.keys(content).length === 0) {
        console.log(
          "[SceneEditor] Content is empty object, starting with empty scene",
        );
        return { elements: [], appState: {}, files: {} };
      }

      // Excalidraw format includes type, version, source - extract what we need
      const data = {
        elements: Array.isArray(content.elements) ? content.elements : [],
        appState: content.appState || {},
        files: content.files || {},
      };

      console.log(
        "[SceneEditor] Parsed initial content:",
        data.elements.length,
        "elements",
        "appState keys:",
        Object.keys(data.appState).length,
        "files keys:",
        Object.keys(data.files).length,
      );

      // Initialize the scene version cache with initial content
      SceneVersionCache.set(sceneId, data.elements);

      return data;
    } catch (err) {
      console.error(
        "[SceneEditor] Error parsing initial content:",
        err,
        initialContent,
      );
      return { elements: [], appState: {}, files: {} };
    }
  }, [initialContent, sceneId]);

  /**
   * Perform the actual save to database
   */
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!excalidrawRef.current || !hasInitializedRef.current) {
      return false;
    }

    const elements = excalidrawRef.current.getSceneElements();

    // Check if actually changed using scene version
    if (SceneVersionCache.isSaved(sceneId, elements)) {
      console.log("[SceneEditor] Scene unchanged, skipping save");
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

      const sceneVersion = getSceneVersion(elements);
      console.log(
        "[SceneEditor] Saving",
        elements.length,
        "elements (version:",
        sceneVersion,
        ") to scene",
        sceneId,
      );

      setIsSaving(true);
      setSaveError(null);

      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[SceneEditor] Save failed:", response.status, errorBody);
        throw new Error(`Failed to save scene (${response.status})`);
      }

      // Update cache and tracking
      SceneVersionCache.set(sceneId, elements);
      lastSaveTimeRef.current = Date.now();
      hasPendingSaveRef.current = false;
      setIsDirty(false);

      console.log("[SceneEditor] Saved successfully (version:", sceneVersion, ")");
      setLastSaved(new Date());
      return true;
    } catch (err) {
      console.error("[SceneEditor] Error saving scene:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [sceneId]);

  /**
   * Throttled save function
   * 
   * Uses SYNC_FULL_SCENE_INTERVAL_MS from app_constants (default 10s)
   * leading: false = don't save on first change
   * trailing: true = save after throttle period
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

  /**
   * Immediate save (for beforeunload, manual save, etc.)
   */
  const immediateSave = useCallback(async () => {
    throttledSave.flush(); // Flush any pending throttled save
    return performSave();
  }, [throttledSave, performSave]);

  /**
   * Handle changes from Excalidraw
   */
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[] | undefined) => {
      // Guard against undefined/null elements
      if (!elements || !Array.isArray(elements)) {
        return;
      }

      // Mark as initialized on first onChange
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        console.log("[SceneEditor] Excalidraw initialized, saving enabled");
        return;
      }

      // Check if scene actually changed
      if (SceneVersionCache.isSaved(sceneId, elements)) {
        // Scene hasn't changed since last save
        setIsDirty(false);
        hasPendingSaveRef.current = false;
        return;
      }

      // Scene has changes
      setIsDirty(true);
      hasPendingSaveRef.current = true;

      // Trigger throttled save
      throttledSave();
    },
    [sceneId, throttledSave],
  );

  /**
   * Handle beforeunload - warn about unsaved changes and try to save
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingSaveRef.current || isSaving) {
        // Try to save immediately - NO WAITING
        if (hasPendingSaveRef.current && !isSaving) {
          immediateSave();
        }

        // Show browser's unsaved changes warning
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaving, immediateSave]);

  /**
   * Visibility change - save when user switches back to tab (if pending)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && hasPendingSaveRef.current && !isSaving) {
        console.log("[SceneEditor] Tab visible, flushing pending save");
        immediateSave();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isSaving, immediateSave]);

  /**
   * Periodic save check - ensures saves don't get stuck
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasPendingSaveRef.current && !isSaving) {
        const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
        if (timeSinceLastSave > SYNC_FULL_SCENE_INTERVAL_MS) {
          console.log("[SceneEditor] Periodic save check - saving pending changes");
          immediateSave();
        }
      }
    }, SYNC_FULL_SCENE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isSaving, immediateSave]);

  // Prevent browser zoom (Ctrl/Cmd+scroll) on scene page
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // Mark loading as complete after initial render
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Reset initialization when scene changes
  useEffect(() => {
    hasInitializedRef.current = false;
    hasPendingSaveRef.current = false;
    lastSaveTimeRef.current = 0;
    setIsDirty(false);
    setSaveError(null);

    // Cancel any pending throttled saves
    throttledSave.cancel();

    return () => {
      // Cleanup on unmount / scene change
      throttledSave.cancel();
    };
  }, [sceneId, initialContent, throttledSave]);

  return (
    <div className="h-full w-full flex flex-col bg-background relative">
      {/* Save Status - floating indicator */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        {saveError && (
          <span className="text-xs text-destructive bg-background/80 px-2 py-1 rounded">
            Save failed: {saveError}
          </span>
        )}
        {isSaving && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}
        {!isSaving && isDirty && (
          <span className="text-xs text-amber-500 bg-background/80 px-2 py-1 rounded flex items-center gap-1">
            <Save className="w-3 h-3" />
            Unsaved changes
          </span>
        )}
        {!isSaving && !isDirty && lastSaved && (
          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="w-full h-full">
            <ExcalidrawWithNotes
              excalidrawRef={excalidrawRef}
              initialData={initialData}
              onChange={handleChange}
              theme={theme === "dark" ? "dark" : "light"}
              gridModeEnabled={false}
              sidebarCollapsed={sidebarCollapsed}
              onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              UIOptions={{
                canvasActions: {
                  changeViewBackgroundColor: true,
                  clearCanvas: true,
                  export: { saveFileToDisk: true },
                  loadScene: true,
                  saveToActiveFile: false,
                  toggleTheme: false,
                  saveAsImage: true,
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
