"use client";

import { useRef, useEffect, useState } from "react";
import {
  ArrowUp,
  X,
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSceneAI, aiSuggestions } from "./scene-ai-context";
import { motion, AnimatePresence } from "motion/react";
import { useFloatingPanel } from "@/hooks/use-floating-panel";

const MIN_WIDTH = 360;
const MIN_HEIGHT = 320;
const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 500;
const EXPANDED_HEIGHT = 600;

const RESIZE_HANDLES = [
  { edge: "top",         cls: "absolute -top-1 left-2 right-2 h-2 cursor-ns-resize" },
  { edge: "bottom",      cls: "absolute -bottom-1 left-2 right-2 h-2 cursor-ns-resize" },
  { edge: "left",        cls: "absolute -left-1 top-2 bottom-2 w-2 cursor-ew-resize" },
  { edge: "right",       cls: "absolute -right-1 top-2 bottom-2 w-2 cursor-ew-resize" },
  { edge: "topleft",     cls: "absolute -top-1 -left-1 w-3 h-3 cursor-nwse-resize z-10" },
  { edge: "topright",    cls: "absolute -top-1 -right-1 w-3 h-3 cursor-nesw-resize z-10" },
  { edge: "bottomleft",  cls: "absolute -bottom-1 -left-1 w-3 h-3 cursor-nesw-resize z-10" },
  { edge: "bottomright", cls: "absolute -bottom-1 -right-1 w-3 h-3 cursor-nwse-resize z-10" },
] as const;

export function SceneChatBubble() {
  const {
    showChatBubble,
    setShowChatBubble,
    setShowInput,
    messages,
    activities,
    inputValue,
    setInputValue,
    isLoading,
    sendMessage,
    closeChat,
  } = useSceneAI();

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const prevHeight = useRef(DEFAULT_HEIGHT);

  // Keep a small margin from parent edges when auto-resizing so the bubble never gets clipped
  const VIEWPORT_MARGIN = 16;

  const { bounds, setBounds, style, startDrag, startResize, reset, isDragging } =
    useFloatingPanel(panelRef, {
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      defaultWidth: DEFAULT_WIDTH,
      defaultHeight: DEFAULT_HEIGHT,
    });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset position when bubble opens
  useEffect(() => {
    if (showChatBubble) {
      reset();
    }
  }, [showChatBubble, reset]);

  // Focus input when bubble appears
  useEffect(() => {
    if (!isLoading && showChatBubble) inputRef.current?.focus();
  }, [isLoading, showChatBubble]);

  if (!showChatBubble) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) sendMessage(inputValue);
  };

  const handleShrink = () => {
    setShowChatBubble(false);
    setShowInput(true);
  };

  const handleClose = () => {
    closeChat();
    reset();
    setIsExpanded(false);
  };

  const toggleExpand = () => {
    const parent = panelRef.current?.parentElement;

    // Fallback to previous behavior if parent cannot be measured
    if (!parent) {
      if (!isExpanded) {
        prevHeight.current = bounds.height;
        if (bounds.height < EXPANDED_HEIGHT) {
          setBounds((b) => ({ ...b, height: EXPANDED_HEIGHT }));
        }
      } else {
        setBounds((b) => ({ ...b, height: prevHeight.current }));
      }
      setIsExpanded(!isExpanded);
      return;
    }

    const parentHeight = parent.clientHeight;
    const maxAllowedHeight = Math.max(
      MIN_HEIGHT,
      parentHeight - VIEWPORT_MARGIN * 2,
    );

    if (!isExpanded) {
      // Store current height so we can restore on collapse
      prevHeight.current = bounds.height;

      // Target expanded height but never exceed available space
      const nextHeight = Math.min(EXPANDED_HEIGHT, maxAllowedHeight);

      // If the new height would overflow the bottom, shift upward
      const overflow = bounds.y + nextHeight + VIEWPORT_MARGIN - parentHeight;
      const nextY = overflow > 0 ? Math.max(VIEWPORT_MARGIN, bounds.y - overflow) : bounds.y;

      setBounds((b) => ({ ...b, height: nextHeight, y: nextY }));
    } else {
      // Collapse back to previous height, clamped to available space, and
      // re-anchor to the current bottom so the bubble drops back down if it
      // was lifted to fit the expanded height.
      const nextHeight = Math.min(prevHeight.current, maxAllowedHeight);

      const currentBottom = bounds.y + bounds.height;
      const desiredY = currentBottom - nextHeight;

      const clampedY = Math.min(
        Math.max(desiredY, VIEWPORT_MARGIN),
        Math.max(VIEWPORT_MARGIN, parentHeight - nextHeight - VIEWPORT_MARGIN),
      );

      setBounds((b) => ({ ...b, height: nextHeight, y: clampedY }));
    }

    setIsExpanded(!isExpanded);
  };

  return (
    <AnimatePresence>
      {showChatBubble && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={style}
          className="absolute z-50 pointer-events-auto"
        >
          {/* Resize handles */}
          {RESIZE_HANDLES.map(({ edge, cls }) => (
            <div key={edge} onMouseDown={startResize(edge)} className={cls} />
          ))}

          <div className="flex flex-col rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden h-full">
            {/* Header — draggable */}
            <div
              onMouseDown={startDrag}
              className={cn(
                "flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3 select-none shrink-0",
                isDragging ? "cursor-grabbing" : "cursor-grab",
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </div>
                <span className="font-medium text-sm text-foreground">
                  Scene Assistant
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleShrink}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  title="Switch to input"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleExpand}
                  className={cn(
                    "rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
                    isExpanded && "text-violet-500 bg-violet-500/10",
                  )}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages — scrollable, shrinks to fit */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    How can I help with your scene?
                  </p>
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm text-violet-500 dark:text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/10 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                          message.role === "user"
                            ? "bg-violet-500 text-white rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md border border-border",
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {message.content}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {activities.length > 0 ? (
                    <div className="space-y-1 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Tool Activity
                      </div>
                      {activities.map((activity) => (
                        <div key={activity.id} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{activity.label}</span>
                          {activity.detail ? ` • ${activity.detail}` : ""}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted border border-border px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-3 shrink-0">
              <form onSubmit={handleSubmit} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-sm">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask AI about your scene..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none py-1 disabled:opacity-50"
                />
                <kbd className="text-xs text-muted-foreground font-mono hidden sm:block">⌘I</kbd>
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="rounded-full bg-violet-500 p-1.5 text-white hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
