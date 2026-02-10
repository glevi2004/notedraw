"use client";

import { useEffect, useState, useRef } from "react";

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
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function generatePreview() {
      if (!content) {
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
            setIsLoading(false);
            return;
          }
        }

        const contentObj = parsedContent as any;
        const elements = contentObj?.elements;

        if (!Array.isArray(elements) || elements.length === 0) {
          setIsLoading(false);
          return;
        }

        // Dynamic import to avoid SSR issues
        const { exportToSvg } = await import("@excalidraw/excalidraw");

        const svg = await exportToSvg({
          elements,
          appState: {
            ...contentObj?.appState,
            exportBackground: true,
            viewBackgroundColor: contentObj?.appState?.viewBackgroundColor || "#121212",
            theme: "dark",
          },
          files: contentObj?.files || {},
          exportPadding: 10,
        });

        if (!mountedRef.current) return;

        const svgString = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        
        setSvgUrl(url);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to generate scene preview:", error);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    generatePreview();

    return () => {
      mountedRef.current = false;
      if (svgUrl) {
        URL.revokeObjectURL(svgUrl);
      }
    };
  }, [content]);

  if (isLoading) {
    return (
      <div className={`bg-secondary animate-pulse ${className}`} />
    );
  }

  if (!svgUrl) {
    // Empty state - show placeholder
    return (
      <div className={`bg-[#121212] flex items-center justify-center ${className}`}>
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
    );
  }

  return (
    <div className={`bg-[#121212] overflow-hidden ${className}`}>
      <img
        src={svgUrl}
        alt="Scene preview"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
