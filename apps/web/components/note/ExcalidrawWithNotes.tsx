"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { NoteEditor } from "./NoteEditor";
import { useTheme } from "@/context/ThemeContext";
import { PanelLeft } from "lucide-react";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return { default: mod.Excalidraw };
  },
  { ssr: false },
);

interface NoteElement {
  id: string;
  type: "note";
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  noteContent?: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  roundness?: { type: number; value?: number } | null;
  isDeleted?: boolean;
}

interface ExcalidrawWithNotesProps {
  excalidrawRef?: React.RefObject<ExcalidrawImperativeAPI | null>;
  initialData?: any;
  onChange?: () => void;
  theme?: "light" | "dark";
  gridModeEnabled?: boolean;
  UIOptions?: any;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

export function ExcalidrawWithNotes({
  excalidrawRef: externalRef,
  initialData,
  onChange,
  theme: propTheme,
  gridModeEnabled = false,
  UIOptions,
  sidebarCollapsed,
  onSidebarToggle,
}: ExcalidrawWithNotesProps) {
  const { theme: contextTheme } = useTheme();
  const internalRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const excalidrawRef = externalRef || internalRef;

  // Track which note is currently being edited (focused)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Track all note elements and app state for rendering overlays
  const [noteElements, setNoteElements] = useState<NoteElement[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(
    new Set(),
  );
  const [appState, setAppState] = useState<{
    scrollX: number;
    scrollY: number;
    zoom: { value: number };
    width: number;
    height: number;
    offsetLeft: number;
    offsetTop: number;
  } | null>(null);

  // Use refs to avoid infinite loops
  const lastNoteElementsRef = useRef<string>("");
  const lastAppStateRef = useRef<string>("");
  const rafIdRef = useRef<number | null>(null);

  const effectiveTheme =
    propTheme || (contextTheme === "dark" ? "dark" : "light");

  // Ensure initialData is properly formatted
  const normalizedInitialData = initialData
    ? {
        elements: Array.isArray(initialData.elements)
          ? initialData.elements
          : [],
        appState: initialData.appState || {},
        files: initialData.files || {},
      }
    : null;

  // Update note content when editing
  const updateNoteContent = useCallback(
    (noteId: string, content: string) => {
      const api = excalidrawRef.current;
      if (!api) return;

      const elements = api.getSceneElements();
      const updatedElements = elements.map((el: any) => {
        if (el.id === noteId) {
          return { ...el, noteContent: content };
        }
        return el;
      });
      api.updateScene({ elements: updatedElements });
      onChange?.();
    },
    [excalidrawRef, onChange],
  );

  // Handle Excalidraw onChange to track note elements and app state
  // Use requestAnimationFrame to batch updates and prevent infinite loops
  const handleExcalidrawChange = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const api = excalidrawRef.current;
      if (!api) return;

      const elements = api.getSceneElements();
      const state = api.getAppState();

      // Extract note elements
      const notes = elements.filter(
        (el: any) => el.type === "note" && !el.isDeleted,
      ) as NoteElement[];

      // Only update note elements state if notes actually changed
      const notesKey = notes
        .map(
          (n) =>
            `${n.id}:${n.x}:${n.y}:${n.width}:${n.height}:${n.noteContent || ""}`,
        )
        .join("|");
      if (notesKey !== lastNoteElementsRef.current) {
        lastNoteElementsRef.current = notesKey;
        setNoteElements(notes);
      }

      // Only update appState if positioning changed
      const appStateKey = `${state.scrollX}:${state.scrollY}:${state.zoom.value}:${state.width}:${state.height}:${state.offsetLeft}:${state.offsetTop}`;
      if (appStateKey !== lastAppStateRef.current) {
        lastAppStateRef.current = appStateKey;
        setAppState({
          scrollX: state.scrollX,
          scrollY: state.scrollY,
          zoom: state.zoom,
          width: state.width,
          height: state.height,
          offsetLeft: state.offsetLeft,
          offsetTop: state.offsetTop,
        });
      }

      // Track selected notes
      const selectedIds = state.selectedElementIds || {};
      const selectedNotes = new Set(
        notes.filter((n) => selectedIds[n.id]).map((n) => n.id),
      );
      setSelectedNoteIds(selectedNotes);
    });

    // Call parent onChange outside of RAF to avoid loops
    onChange?.();
  }, [excalidrawRef, onChange]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Convert scene coords to viewport coords
  const sceneToViewport = useCallback(
    (sceneX: number, sceneY: number) => {
      if (!appState) return { x: 0, y: 0 };
      return {
        x: (sceneX + appState.scrollX) * appState.zoom.value,
        y: (sceneY + appState.scrollY) * appState.zoom.value,
      };
    },
    [appState],
  );

  // Handle clicking on note border to select (show wireframe)
  const handleNoteBorderClick = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // Select in Excalidraw to show wireframe, but don't start editing
      const api = excalidrawRef.current;
      if (api) {
        api.updateScene({
          appState: {
            selectedElementIds: { [noteId]: true },
          },
        });
      }
    },
    [excalidrawRef],
  );

  // Handle clicking on note content to start editing
  const handleNoteContentClick = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // Start editing on single click
      if (editingNoteId !== noteId) {
        setEditingNoteId(noteId);
      }
    },
    [editingNoteId],
  );

  // Handle clicking outside to stop editing
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      // Only stop editing if clicking outside the note editor
      if (
        editingNoteId &&
        !(e.target as HTMLElement).closest(".note-editor-container")
      ) {
        setEditingNoteId(null);
      }
    },
    [editingNoteId],
  );

  return (
    <div
      className="w-full h-full relative"
      style={{ touchAction: "none" }}
      onClick={handleContainerClick}
    >
      <style>{`
        .excalidraw .main-menu-trigger {
          margin-left: 44px !important;
        }
        .excalidraw .main-menu-trigger:focus,
        .excalidraw .main-menu-trigger:active {
          outline: none;
          box-shadow: 0 0 0 1px var(--color-surface-lowest);
        }
        .excalidraw .sidebar-toggle-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--lg-button-size);
          height: var(--lg-button-size);
          padding: 0.625rem;
          box-sizing: border-box;
          border-radius: var(--border-radius-lg);
          border: none;
          outline: none;
          cursor: pointer;
          background-color: var(--color-surface-low);
          box-shadow: 0 0 0 1px var(--color-surface-lowest);
          color: var(--icon-fill-color);
        }
        .excalidraw .sidebar-toggle-btn:focus,
        .excalidraw .sidebar-toggle-btn:active {
          outline: none;
          box-shadow: 0 0 0 1px var(--color-surface-lowest);
        }
        .excalidraw .sidebar-toggle-btn svg {
          width: var(--lg-icon-size);
          height: var(--lg-icon-size);
        }
      `}</style>
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
          (
            excalidrawRef as React.MutableRefObject<ExcalidrawImperativeAPI | null>
          ).current = api;
        }}
        initialData={normalizedInitialData}
        onChange={handleExcalidrawChange}
        theme={effectiveTheme}
        gridModeEnabled={gridModeEnabled}
        UIOptions={{
          ...UIOptions,
          tools: { ...UIOptions?.tools, note: true },
        }}
      >
        {/* Sidebar toggle - rendered inside Excalidraw to inherit CSS variables */}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="sidebar-toggle-btn"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft />
          </button>
        )}
      </Excalidraw>

      {/* Render note overlays with embedded WYSIWYG editors */}
      {appState &&
        noteElements.map((note) => {
          const { x, y } = sceneToViewport(note.x, note.y);
          const scale = appState.zoom.value;
          const isEditing = editingNoteId === note.id;

          // Calculate corner radius
          const cornerRadius = note.roundness
            ? Math.min(note.width, note.height) * 0.1
            : 0;

          return (
            <div
              key={note.id}
              className={`absolute ${isEditing ? "note-editor-container" : ""}`}
              style={{
                // Position at viewport coordinates
                left: x,
                top: y,
                // Use unscaled dimensions + transform for seamless scaling
                width: `${note.width}px`,
                height: `${note.height}px`,
                transformOrigin: "0 0",
                transform: `scale(${scale})${note.angle ? ` rotate(${note.angle}rad)` : ""}`,
                // Always capture pointer events
                pointerEvents: "auto",
                zIndex: isEditing ? 100 : 10,
              }}
              onClick={(e) => {
                // Border click - show wireframe selection
                if (!isEditing) {
                  handleNoteBorderClick(note.id, e);
                }
              }}
            >
              {/* Draw the note with background, border, and embedded editor */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor:
                    note.backgroundColor === "transparent"
                      ? effectiveTheme === "dark"
                        ? "#2d2d2d"
                        : "#fffce8"
                      : note.backgroundColor || "#fffce8",
                  border: `${note.strokeWidth || 2}px solid ${note.strokeColor || "#1e1e1e"}`,
                  borderRadius: `${cornerRadius}px`,
                  overflow: "hidden",
                  boxSizing: "border-box",
                  boxShadow: isEditing
                    ? "0 4px 12px rgba(0,0,0,0.15)"
                    : "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    overflow: "auto",
                    pointerEvents: "auto",
                  }}
                  onClick={(e) => {
                    // Content click - start editing
                    if (!isEditing) {
                      handleNoteContentClick(note.id, e);
                    }
                  }}
                >
                  <NoteEditor
                    content={note.noteContent || ""}
                    onChange={(content) => updateNoteContent(note.id, content)}
                    editable={isEditing}
                    theme={effectiveTheme}
                  />
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default ExcalidrawWithNotes;
