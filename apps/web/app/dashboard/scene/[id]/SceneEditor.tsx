"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useTheme } from "@/context/ThemeContext";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useSidebar } from "@/app/dashboard/components/SidebarContext";

// Dynamically import Excalidraw components to avoid SSR issues
const ExcalidrawWithNotes = dynamic(
  async () => {
    const mod = await import("@/components/note");
    return { default: mod.ExcalidrawWithNotes };
  },
  { ssr: false },
);

// Excalidraw CSS is now imported by the source components (SCSS)
// via the local packages. No separate CSS import needed.

interface SceneEditorProps {
  sceneId: string;
  title: string;
  initialContent: unknown; // Prisma Json type
}

// Stable debounce hook — uses a ref for the callback so the returned
// function keeps the same identity across renders.
function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}

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
  const lastSavedContentRef = useRef<string | null>(null);
  const readyToSaveRef = useRef(false);

  // Parse initial content — useMemo since this is computed data, not a callback
  const initialData = useMemo(() => {
    if (!initialContent) {
      console.log("[SceneEditor] No initial content, starting with empty scene");
      return { elements: [], appState: {}, files: {} };
    }

    try {
      const content = initialContent as any;
      const data = {
        elements: Array.isArray(content.elements) ? content.elements : [],
        appState: content.appState || {},
        files: content.files || {},
      };
      console.log(
        "[SceneEditor] Parsed initial content:",
        data.elements.length,
        "elements",
      );
      return data;
    } catch (err) {
      console.error("[SceneEditor] Error parsing initial content:", err);
      return { elements: [], appState: {}, files: {} };
    }
  }, [initialContent]);

  // Initialize lastSavedContentRef after Excalidraw has mounted and processed
  // initialData. This prevents the first auto-save from overwriting DB content.
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (excalidrawRef.current) {
        try {
          const { serializeAsJSON } = await import("@excalidraw/excalidraw");
          const elements = excalidrawRef.current.getSceneElements();
          const appState = excalidrawRef.current.getAppState();
          const files = excalidrawRef.current.getFiles();
          lastSavedContentRef.current = serializeAsJSON(
            elements,
            appState,
            files,
            "database",
          );
          console.log(
            "[SceneEditor] Initialized save baseline with",
            elements.length,
            "elements",
          );
        } catch (err) {
          console.warn("[SceneEditor] Could not initialize save baseline:", err);
        }
      }
      readyToSaveRef.current = true;
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-save with debounce (save 2s after last change)
  const saveContent = useDebouncedCallback(async () => {
    if (!excalidrawRef.current || !readyToSaveRef.current) return;

    try {
      const { serializeAsJSON } = await import("@excalidraw/excalidraw");

      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();
      const files = excalidrawRef.current.getFiles();

      const serialized = serializeAsJSON(
        elements,
        appState,
        files,
        "database",
      );

      // Only save if content actually changed
      if (lastSavedContentRef.current === serialized) {
        return;
      }

      console.log(
        "[SceneEditor] Saving",
        elements.length,
        "elements to scene",
        sceneId,
      );

      lastSavedContentRef.current = serialized;
      const content = JSON.parse(serialized);

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

      console.log("[SceneEditor] Saved successfully");
      setLastSaved(new Date());
    } catch (err) {
      console.error("[SceneEditor] Error saving scene:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, 2000);

  const handleChange = useCallback(() => {
    saveContent();
  }, [saveContent]);

  // Handle beforeunload to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaving]);

  // Prevent browser zoom (Ctrl/Cmd+scroll) on scene page - let Excalidraw handle it
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
        {!isSaving && lastSaved && (
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
