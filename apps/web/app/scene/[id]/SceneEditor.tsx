"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

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

// Simple debounce hook
function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}

export function SceneEditor({
  sceneId,
  title,
  initialContent,
}: SceneEditorProps) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const { theme } = useTheme();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastSavedContentRef = useRef<string | null>(null);

  // Parse initial content
  const initialData = useCallback(() => {
    if (!initialContent) {
      return {
        elements: [],
        appState: {},
        files: {},
      };
    }

    try {
      // Handle both Excalidraw format and legacy notedraw format
      const content = initialContent as any;

      // If it's already in Excalidraw format (has elements and appState)
      if (content.elements && content.appState) {
        return {
          elements: Array.isArray(content.elements) ? content.elements : [],
          appState: content.appState || {},
          files: content.files || {},
        };
      }

      // Legacy notedraw format - migrate to Excalidraw format
      if (content.elements) {
        return {
          elements: Array.isArray(content.elements)
            ? migrateElements(content.elements)
            : [],
          appState: migrateAppState(content.appState),
          files: content.files || {},
        };
      }

      return {
        elements: [],
        appState: {},
        files: {},
      };
    } catch (err) {
      console.error("Error parsing initial content:", err);
      return {
        elements: [],
        appState: {},
        files: {},
      };
    }
  }, [initialContent]);

  // Auto-save with debounce (save 2s after last change)
  const saveContent = useDebouncedCallback(async () => {
    if (!excalidrawRef.current) return;

    try {
      // Dynamically import serializeAsJSON only on client side
      const { serializeAsJSON } = await import("@excalidraw/excalidraw");

      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();
      const files = excalidrawRef.current.getFiles();

      // Include note content from the note store
      const noteStore = (excalidrawRef.current as any).getNoteStore?.();
      const elementsWithNoteContent = elements.map((el: any) => {
        if (el.type === "embeddable" && el.link?.startsWith("note://")) {
          const noteId = el.link.replace("note://", "");
          const noteContent = noteStore?.get(noteId);
          if (noteContent) {
            return {
              ...el,
              customData: {
                ...el.customData,
                noteContent,
              },
            };
          }
        }
        return el;
      });

      // Serialize to JSON for storage
      const serialized = serializeAsJSON(
        elementsWithNoteContent,
        appState,
        files,
        "database",
      );

      // Only save if content actually changed
      if (lastSavedContentRef.current === serialized) {
        return; // No changes, skip save
      }

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
        throw new Error("Failed to save scene");
      }

      setLastSaved(new Date());
    } catch (err) {
      console.error("Error saving scene:", err);
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

  // Mark loading as complete after initial render and initialize last saved content
  useEffect(() => {
    setIsLoading(false);

    // Initialize lastSavedContentRef with initial content to prevent saving on first load
    const initializeLastSavedContent = async () => {
      if (initialContent) {
        try {
          const { serializeAsJSON } = await import("@excalidraw/excalidraw");
          const data = initialData();
          if (data.elements || data.appState) {
            const serialized = serializeAsJSON(
              data.elements || [],
              data.appState || {},
              data.files || {},
              "database",
            );
            lastSavedContentRef.current = serialized;
          }
        } catch (err) {
          // If serialization fails, just continue without initializing
          console.warn("Could not initialize last saved content:", err);
        }
      }
    };

    initializeLastSavedContent();
  }, [initialContent, initialData]);

  const handleBack = () => {
    router.push("/dashboard");
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <span className="text-sm font-medium truncate max-w-[300px]">
            {title}
          </span>
        </div>

        {/* Note tool is now built into Excalidraw's native toolbar */}
        <div className="flex items-center" />

        {/* Save Status */}
        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-xs text-destructive">
              Save failed: {saveError}
            </span>
          )}
          {isSaving && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </div>
          )}
          {!isSaving && lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

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
              initialData={initialData()}
              onChange={handleChange}
              theme={theme === "dark" ? "dark" : "light"}
              gridModeEnabled={false}
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

// Migration functions from notedraw format to Excalidraw format
function migrateElements(elements: any[]): any[] {
  if (!Array.isArray(elements)) return [];

  return elements.map((el: any) => {
    // Map notedraw element types to Excalidraw types
    const typeMap: Record<string, string> = {
      rectangle: "rectangle",
      ellipse: "ellipse",
      diamond: "diamond",
      line: "line",
      arrow: "arrow",
      freedraw: "freedraw",
      text: "text",
      image: "image",
    };

    const type = typeMap[el.type] || "rectangle";

    // Base element properties
    const migrated: any = {
      id: el.id || generateId(),
      type,
      x: el.x || 0,
      y: el.y || 0,
      width: el.width || 100,
      height: el.height || 100,
      angle: el.angle || 0,
      strokeColor: el.strokeColor || "#1e1e1e",
      backgroundColor: el.backgroundColor || "transparent",
      fillStyle: el.fillStyle || "solid",
      strokeWidth: el.strokeWidth || 2,
      strokeStyle: el.strokeStyle || "solid",
      roughness: el.roughness ?? 1,
      opacity: el.opacity ?? 100,
      groupIds: el.groupIds || [],
      frameId: el.frameId || null,
      boundElements: el.boundElements || [],
      updated: el.updated || Date.now(),
      version: el.version || 1,
      versionNonce: el.versionNonce || Date.now(),
      isDeleted: el.isDeleted || false,
      seed: el.seed || Math.floor(Math.random() * 100000),
      roundness: el.roundness || null,
    };

    // Type-specific properties
    if (type === "line" || type === "arrow") {
      migrated.points = el.points || [
        [0, 0],
        [100, 0],
      ];
      migrated.startBinding = el.startBinding || null;
      migrated.endBinding = el.endBinding || null;
      migrated.startArrowhead = el.startArrowhead || null;
      migrated.endArrowhead =
        el.endArrowhead || (type === "arrow" ? "arrow" : null);
      migrated.elbowed = el.elbowed || false;
      migrated.fixedSegments = el.fixedSegments || null;
    }

    if (type === "text") {
      migrated.text = el.text || "";
      migrated.fontSize = el.fontSize || 20;
      migrated.fontFamily = el.fontFamily || 1; // Excalidraw font family value
      migrated.textAlign = el.textAlign || "left";
      migrated.verticalAlign = el.verticalAlign || "top";
      migrated.containerId = el.containerId || null;
      migrated.originalText = el.originalText || el.text || "";
      migrated.lineHeight = el.lineHeight || 1.25;
    }

    if (type === "freedraw") {
      migrated.points = el.points || [];
      migrated.simulatePressure = el.simulatePressure ?? true;
      migrated.pressures = el.pressures || [];
    }

    if (type === "image") {
      migrated.fileId = el.fileId || null;
      migrated.scale = el.scale || [1, 1];
      migrated.status = el.status || "saved";
    }

    return migrated;
  });
}

function migrateAppState(appState: any): any {
  if (!appState) return getDefaultAppState();

  return {
    ...getDefaultAppState(),
    theme: appState.theme || "light",
    viewBackgroundColor: appState.viewBackgroundColor || "#ffffff",
    zoom: appState.zoom || { value: 1 },
    scrollX: appState.scroll?.scrollX || 0,
    scrollY: appState.scroll?.scrollY || 0,
    gridSize: appState.gridSize || null,
    gridModeEnabled: appState.showGrid || false,
    selectedElementIds: appState.selectedElementIds || {},
    editingElementId: appState.editingElementId || null,
    currentStrokeColor: appState.currentStrokeColor || "#1e1e1e",
    currentBackgroundColor: appState.currentBackgroundColor || "transparent",
    currentFillStyle: appState.currentFillStyle || "solid",
    currentStrokeWidth: appState.currentStrokeWidth || 2,
    currentStrokeStyle: appState.currentStrokeStyle || "solid",
    currentRoughness: appState.currentRoughness || 1,
    currentOpacity: appState.currentOpacity ?? 100,
    currentFontSize: appState.currentFontSize || 20,
    currentFontFamily: appState.currentFontFamily || 1,
  };
}

function getDefaultAppState(): any {
  return {
    theme: "light",
    viewBackgroundColor: "#ffffff",
    zoom: { value: 1 },
    scrollX: 0,
    scrollY: 0,
    gridSize: null,
    gridModeEnabled: false,
    selectedElementIds: {},
    selectedGroupIds: {},
    editingElementId: null,
    currentStrokeColor: "#1e1e1e",
    currentBackgroundColor: "transparent",
    currentFillStyle: "solid",
    currentStrokeWidth: 2,
    currentStrokeStyle: "solid",
    currentRoughness: 1,
    currentOpacity: 100,
    currentFontSize: 20,
    currentFontFamily: 1,
    currentTextAlign: "left",
    currentStartArrowhead: null,
    currentEndArrowhead: "arrow",
    name: "",
    collaborators: new Map(),
    activeTool: {
      type: "selection",
      customType: null,
      locked: false,
    },
    penMode: false,
    penDetected: false,
    exportBackground: true,
    exportScale: 1,
    exportEmbedScene: false,
    exportWithDarkMode: false,
    openMenu: null,
    openPopup: null,
    openSidebar: null,
    openDialog: null,
    pasteDialog: { shown: false, data: null },
    previousSelectedElementIds: {},
    shouldCacheIgnoreZoom: false,
    zenModeEnabled: false,
    toast: null,
    editingGroupId: null,
    selectionElement: null,
    isBindingEnabled: true,
    startBoundElement: null,
    suggestedBinding: null,
    stats: { open: false, panels: 0 },
    frameRendering: { enabled: true, clip: true, name: true, outline: true },
    objectsSnapModeEnabled: false,
  };
}

function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
