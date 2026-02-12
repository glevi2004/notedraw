"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RefObject } from "react";

interface FloatingPanelOptions {
  minWidth: number;
  minHeight: number;
  defaultWidth: number;
  defaultHeight: number;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Interaction =
  | { type: "idle" }
  | { type: "drag"; startMouse: { x: number; y: number }; startBounds: Bounds }
  | { type: "resize"; edge: string; startMouse: { x: number; y: number }; startBounds: Bounds };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Hook for a draggable + resizable floating panel.
 *
 * Positions itself at the bottom-right of its parent on mount.
 * All transient interaction state lives in a ref so the global
 * mousemove/mouseup listeners are registered exactly once.
 */
export function useFloatingPanel(
  panelRef: RefObject<HTMLDivElement | null>,
  { minWidth, minHeight, defaultWidth, defaultHeight }: FloatingPanelOptions,
) {
  const [bounds, setBounds] = useState<Bounds>({
    x: -1,        // sentinel: not yet positioned
    y: -1,
    width: defaultWidth,
    height: defaultHeight,
  });
  const [isDragging, setIsDragging] = useState(false);

  // Always-current bounds for use inside event handlers without re-registering listeners
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const interaction = useRef<Interaction>({ type: "idle" });

  // Position to bottom-right on first mount / reset
  useEffect(() => {
    if (bounds.x >= 0) return;
    const parent = panelRef.current?.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;
    setBounds((b) => ({
      ...b,
      x: width - b.width - 16,
      y: height - b.height - 16,
    }));
  }, [bounds.x, panelRef]);

  // Single global listener pair — deps are all stable (ref + constants)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const state = interaction.current;
      if (state.type === "idle") return;

      const parent = panelRef.current?.parentElement;
      if (!parent) return;
      const pr = parent.getBoundingClientRect();
      const dx = e.clientX - state.startMouse.x;
      const dy = e.clientY - state.startMouse.y;

      if (state.type === "drag") {
        const cur = boundsRef.current;
        setBounds({
          ...cur,
          x: clamp(state.startBounds.x + dx, 0, pr.width - cur.width),
          y: clamp(state.startBounds.y + dy, 0, pr.height - cur.height),
        });
        return;
      }

      // Resize
      const { edge, startBounds: sb } = state;
      let { x, y, width, height } = sb;

      if (edge.includes("right")) {
        width = clamp(sb.width + dx, minWidth, pr.width - x);
      }
      if (edge.includes("left")) {
        const d = clamp(dx, -x, sb.width - minWidth);
        width = sb.width - d;
        x = sb.x + d;
      }
      if (edge.includes("bottom")) {
        height = clamp(sb.height + dy, minHeight, pr.height - y);
      }
      if (edge.includes("top")) {
        const d = clamp(dy, -y, sb.height - minHeight);
        height = sb.height - d;
        y = sb.y + d;
      }

      setBounds({ x, y, width, height });
    };

    const onMouseUp = () => {
      if (interaction.current.type === "drag") setIsDragging(false);
      interaction.current = { type: "idle" };
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [panelRef, minWidth, minHeight]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setIsDragging(true);
    interaction.current = {
      type: "drag",
      startMouse: { x: e.clientX, y: e.clientY },
      startBounds: { ...boundsRef.current },
    };
  }, []);

  const startResize = useCallback(
    (edge: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      interaction.current = {
        type: "resize",
        edge,
        startMouse: { x: e.clientX, y: e.clientY },
        startBounds: { ...boundsRef.current },
      };
    },
    [],
  );

  const reset = useCallback(() => {
    setBounds({ x: -1, y: -1, width: defaultWidth, height: defaultHeight });
    interaction.current = { type: "idle" };
    setIsDragging(false);
  }, [defaultWidth, defaultHeight]);

  const style: React.CSSProperties = {
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minHeight,
  };

  return { bounds, setBounds, style, startDrag, startResize, reset, isDragging };
}
