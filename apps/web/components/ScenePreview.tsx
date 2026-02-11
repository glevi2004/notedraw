"use client";

import { useEffect, useState, useRef } from "react";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "@/context/ThemeContext";
import {
  buildPreviewElements,
  computePreviewPadding,
  normalizeFilesForPreview,
  serializeNoteContentToHtml,
} from "./scene-preview-utils";
import { SVG_NS } from "@excalidraw/common";
import { getCommonBounds, getNonDeletedElements } from "@excalidraw/element";

interface ScenePreviewProps {
  content: unknown;
  className?: string;
}

/**
 * ScenePreview - Generates a preview from Excalidraw scene content using exportToSvg
 * 
 * Uses Excalidraw's exportToSvg to generate an SVG preview of the actual scene content.
 * Falls back to a placeholder if no content or export fails.
 */
export function ScenePreview({ content, className = "" }: ScenePreviewProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [hasPreview, setHasPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const { theme } = useTheme();

  useEffect(() => {
    mountedRef.current = true;

    async function generatePreview() {
      setIsLoading(true);
      if (!content) {
        if (svgContainerRef.current) {
          svgContainerRef.current.replaceChildren();
        }
        setHasPreview(false);
        setIsLoading(false);
        return;
      }

      try {
        // Parse content if it's a string
        let parsedContent = content;
        if (typeof content === "string") {
          try {
            parsedContent = JSON.parse(content);
          } catch {
            if (svgContainerRef.current) {
              svgContainerRef.current.replaceChildren();
            }
            setHasPreview(false);
            setIsLoading(false);
            return;
          }
        }

        const contentObj = parsedContent as any;
        const elements = contentObj?.elements;

        if (!Array.isArray(elements) || elements.length === 0) {
          if (svgContainerRef.current) {
            svgContainerRef.current.replaceChildren();
          }
          setHasPreview(false);
          setIsLoading(false);
          return;
        }

        // Dynamic import to avoid SSR issues
        const { exportToSvg } = await import("@excalidraw/excalidraw");

        const { elements: previewElements, notes } = buildPreviewElements(
          elements,
          theme,
          { noteRenderMode: "none", collectNotes: true },
        );
        if (previewElements.length === 0) {
          if (svgContainerRef.current) {
            svgContainerRef.current.replaceChildren();
          }
          setHasPreview(false);
          setIsLoading(false);
          return;
        }

        const viewBackgroundColor =
          contentObj?.appState?.viewBackgroundColor ||
          (theme === "dark" ? "#0f1115" : "#ffffff");
        const exportPadding = computePreviewPadding(previewElements);
        const normalizedFiles = await normalizeFilesForPreview(
          contentObj?.files || {},
          previewElements,
        );

        const svg = await exportToSvg({
          elements: previewElements,
          appState: {
            ...contentObj?.appState,
            exportBackground: true,
            exportWithDarkMode: theme === "dark",
            viewBackgroundColor,
          },
          files: normalizedFiles,
          exportPadding,
        });

        if (!mountedRef.current) return;

        if (notes.length > 0) {
          const nonDeleted = getNonDeletedElements(previewElements as any);
          if (nonDeleted.length > 0) {
            const [minX, minY] = getCommonBounds(nonDeleted as any);
            const offsetX = -minX + exportPadding;
            const offsetY = -minY + exportPadding;
            for (const note of notes) {
              const html = serializeNoteContentToHtml(note.noteContent);
              if (!html) continue;

              const foreignObject = svg.ownerDocument.createElementNS(
                SVG_NS,
                "foreignObject",
              );
              const x = note.x + offsetX;
              const y = note.y + offsetY;
              foreignObject.setAttribute("x", `${x}`);
              foreignObject.setAttribute("y", `${y}`);
              foreignObject.setAttribute("width", `${note.width}`);
              foreignObject.setAttribute("height", `${note.height}`);
              const angle = note.angle || 0;
              if (angle) {
                const rotation = (angle * 180) / Math.PI;
                const cx = x + note.width / 2;
                const cy = y + note.height / 2;
                foreignObject.setAttribute(
                  "transform",
                  `rotate(${rotation} ${cx} ${cy})`,
                );
              }

              const wrapper = svg.ownerDocument.createElementNS(
                "http://www.w3.org/1999/xhtml",
                "div",
              );
              wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
              wrapper.style.width = "100%";
              wrapper.style.height = "100%";
              wrapper.style.boxSizing = "border-box";
              wrapper.style.overflow = "hidden";
              wrapper.style.borderRadius = `${note.borderRadius}px`;
              wrapper.style.background = note.backgroundColor;
              wrapper.style.border = `${note.strokeWidth}px solid ${note.strokeColor}`;
              wrapper.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";

              const container = svg.ownerDocument.createElementNS(
                "http://www.w3.org/1999/xhtml",
                "div",
              );
              container.setAttribute(
                "class",
                "bn-container bn-default-styles bn-root blocknote-transparent",
              );
              container.setAttribute(
                "data-color-scheme",
                theme === "dark" ? "dark" : "light",
              );
              container.style.width = "100%";
              container.style.height = "100%";
              container.style.background = "transparent";
              container.style.color = theme === "dark" ? "#e5e7eb" : "#111827";

              const editor = svg.ownerDocument.createElementNS(
                "http://www.w3.org/1999/xhtml",
                "div",
              );
              editor.setAttribute("class", "bn-editor");
              editor.setAttribute("contenteditable", "false");
              editor.style.padding = "8px 12px";
              editor.style.boxSizing = "border-box";
              editor.style.height = "100%";
              editor.style.overflow = "hidden";
              editor.style.background = "transparent";
              editor.innerHTML = html;

              container.appendChild(editor);
              wrapper.appendChild(container);
              foreignObject.appendChild(wrapper);
              svg.appendChild(foreignObject);
            }
          }
        }

        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");

        if (svgContainerRef.current) {
          svgContainerRef.current.replaceChildren(svg);
        }

        setHasPreview(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to generate scene preview:", error);
        if (mountedRef.current) {
          if (svgContainerRef.current) {
            svgContainerRef.current.replaceChildren();
          }
          setHasPreview(false);
          setIsLoading(false);
        }
      }
    }

    generatePreview();

    return () => {
      mountedRef.current = false;
      if (svgContainerRef.current) {
        svgContainerRef.current.replaceChildren();
      }
    };
  }, [content, theme]);

  return (
    <div className={`relative bg-card overflow-hidden ${className}`}>
      <div
        ref={svgContainerRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-label="Scene preview"
      />
      {isLoading && (
        <div className="absolute inset-0 bg-secondary animate-pulse" />
      )}
      {!isLoading && !hasPreview && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-muted-foreground/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
