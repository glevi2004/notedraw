"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useTheme } from "@/context/ThemeContext";
import { Loader2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useSidebar } from "@/app/dashboard/components/SidebarContext";
import { useThrottledSceneSave } from "@/hooks/use-throttled-scene-save";

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
 * Simplified SceneEditor using the useThrottledSceneSave hook
 * 
 * This is a cleaner alternative to SceneEditor.tsx that uses the hook
 * for all save logic. Both implementations have the same functionality.
 * 
 * Uses SYNC_FULL_SCENE_INTERVAL_MS from app_constants (default 10s)
 */
export function SceneEditorSimple({
  sceneId,
  title,
  initialContent,
}: SceneEditorProps) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const { theme } = useTheme();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [setSidebarCollapsed, sidebarCollapsed]);

  // Parse initial content
  const initialData = useMemo(() => {
    if (!initialContent || initialContent === null) {
      return { elements: [], appState: {}, files: {} };
    }

    try {
      let content = initialContent as any;

      if (typeof content === "string") {
        try {
          content = JSON.parse(content);
        } catch (e) {
          return { elements: [], appState: {}, files: {} };
        }
      }

      if (typeof content === "object" && Object.keys(content).length === 0) {
        return { elements: [], appState: {}, files: {} };
      }

      return {
        elements: Array.isArray(content.elements) ? content.elements : [],
        appState: content.appState || {},
        files: content.files || {},
      };
    } catch (err) {
      console.error("[SceneEditor] Error parsing initial content:", err);
      return { elements: [], appState: {}, files: {} };
    }
  }, [initialContent]);

  // Use the throttled save hook
  const {
    isSaving,
    isDirty,
    saveError,
    lastSaved,
    handleChange,
    saveImmediately,
    flushPendingSave,
  } = useThrottledSceneSave(excalidrawRef, {
    sceneId,
    apiEndpoint: `/api/scenes/${sceneId}`,
    onSaveError: (error) => {
      console.error("[SceneEditor] Save failed:", error);
    },
  });

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || isSaving) {
        flushPendingSave();
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isSaving, flushPendingSave]);

  // Handle visibility change - save when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isDirty && !isSaving) {
        saveImmediately();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isDirty, isSaving, saveImmediately]);

  // Prevent browser zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-background relative">
      {/* Save Status */}
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
        <div className="w-full h-full">
          <ExcalidrawWithNotes
            excalidrawRef={excalidrawRef}
            initialData={initialData}
            onChange={handleChange}
            theme={theme === "dark" ? "dark" : "light"}
            gridModeEnabled={false}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={handleSidebarToggle}
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
      </div>
    </div>
  );
}
