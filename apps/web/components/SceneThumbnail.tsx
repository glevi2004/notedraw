"use client";

import { useEffect, useRef, useState } from "react";
import { exportToCanvas } from "@excalidraw/utils";
import { useTheme } from "@/context/ThemeContext";
import {
  buildPreviewElements,
  computePreviewPadding,
  normalizeFilesForPreview,
} from "./scene-preview-utils";

interface SceneThumbnailProps {
  content: unknown; // Scene content from Prisma (Json type)
  className?: string;
  width?: number;
  height?: number;
}

/**
 * SceneThumbnail component that renders Excalidraw scene previews as thumbnails
 * 
 * Handles:
 * - Loading state with spinner
 * - Error state with fallback gradient
 * - Empty scenes with placeholder icon
 * - Proper canvas rendering with Excalidraw's exportToCanvas
 */
export function SceneThumbnail({
  content,
  className = "",
  width,
  height,
}: SceneThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const renderThumbnail = async () => {
      if (!canvasRef.current) {
        setIsLoading(false);
        return;
      }

      // Handle null/undefined content
      if (!content) {
        setIsEmpty(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);
        setIsEmpty(false);

        // Parse scene content
        const sceneData = content as {
          elements?: unknown[];
          appState?: Record<string, unknown>;
          files?: Record<string, unknown>;
        };

        // Check if scene is empty
        if (
          !sceneData.elements ||
          !Array.isArray(sceneData.elements) ||
          sceneData.elements.length === 0
        ) {
          setIsEmpty(true);
          setIsLoading(false);
          return;
        }

        const { elements: previewElements } = buildPreviewElements(
          sceneData.elements as any[],
          theme,
        );
        if (previewElements.length === 0) {
          setIsEmpty(true);
          setIsLoading(false);
          return;
        }

        // Render scene to canvas using Excalidraw's export utility
        const exportPadding = computePreviewPadding(previewElements);
        const viewBackgroundColor =
          (sceneData.appState as any)?.viewBackgroundColor ||
          (theme === "dark" ? "#0f1115" : "#ffffff");
        const normalizedFiles = await normalizeFilesForPreview(
          sceneData.files as any,
          previewElements,
        );

        const canvas = await exportToCanvas({
          elements: previewElements as any,
          appState: {
            ...sceneData.appState,
            exportBackground: true,
            exportWithDarkMode: theme === "dark",
            viewBackgroundColor,
          } as any,
          files: normalizedFiles as any,
          maxWidthOrHeight: 400, // Thumbnail size
          exportPadding,
        });

        // Draw to the ref canvas
        const ctx = canvasRef.current.getContext("2d");
        if (ctx && canvas) {
          canvasRef.current.width = canvas.width;
          canvasRef.current.height = canvas.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(canvas, 0, 0);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error rendering thumbnail:", err);
        setHasError(true);
        setIsLoading(false);
      }
    };

    renderThumbnail();
  }, [content, theme]);

  // Apply custom width/height if provided
  const containerStyle: Record<string, string> = {};
  if (width) containerStyle.width = `${width}px`;
  if (height) containerStyle.height = `${height}px`;

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={Object.keys(containerStyle).length > 0 ? containerStyle : undefined}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ display: isLoading || hasError || isEmpty ? "none" : "block" }}
      />
      {(isLoading || hasError || isEmpty) && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-card/20 flex items-center justify-center">
          {isLoading && (
            <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
          )}
          {isEmpty && !isLoading && (
            <div className="w-16 h-16 text-muted-foreground/40">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-full h-full"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
