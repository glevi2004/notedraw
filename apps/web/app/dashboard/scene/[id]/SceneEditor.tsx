"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useTheme } from "@/context/ThemeContext";
import { Loader2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useSidebar } from "@/app/dashboard/components/SidebarContext";
import { SceneVersionCache } from "@/lib/scene-version";
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
  title?: string;
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
  initialContent,
}: SceneEditorProps) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const { theme } = useTheme();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [isLoading, setIsLoading] = useState(true);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [setSidebarCollapsed, sidebarCollapsed]);

  const uiOptions = useMemo(
    () => ({
      canvasActions: {
        changeViewBackgroundColor: true,
        clearCanvas: true,
        export: { saveFileToDisk: true },
        loadScene: true,
        saveToActiveFile: false,
        toggleTheme: false,
        saveAsImage: true,
      },
    }),
    [],
  );

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
    onSaveError: (error) => console.error("[SceneEditor] Save failed:", error),
  });

  /**
   * Handle beforeunload - warn about unsaved changes and try to save
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || isSaving) {
        void flushPendingSave();

        // Show browser's unsaved changes warning
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaving, isDirty, flushPendingSave]);

  /**
   * Visibility change - save when user switches back to tab (if pending)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isDirty && !isSaving) {
        console.log("[SceneEditor] Tab visible, flushing pending save");
        void saveImmediately();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isSaving, isDirty, saveImmediately]);

  /**
   * Periodic save check - ensures saves don't get stuck
   */
  // The hook handles throttling and exit flushes; no extra interval needed.

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

  // Mark loading as complete after initial render / scene change
  useEffect(() => {
    setIsLoading(false);
    return () => {
      void flushPendingSave();
    };
  }, [sceneId, initialContent, flushPendingSave]);

  return (
    <div className="h-full w-full flex flex-col bg-background relative">
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
              onSidebarToggle={handleSidebarToggle}
              UIOptions={uiOptions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
