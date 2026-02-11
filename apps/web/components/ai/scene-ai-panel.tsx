"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { 
  ArrowUp,
  HelpCircle,
  X,
  Loader2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSceneAI, aiSuggestions } from "./scene-ai-context";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";

export function SceneAIPanel() {
  const { 
    showAI, 
    setShowAI, 
    messages, 
    inputValue, 
    setInputValue, 
    isLoading, 
    sendMessage,
    sidebarWidth,
    setSidebarWidth
  } = useSceneAI();
  
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSidebarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 280px and 800px
      const constrainedWidth = Math.min(Math.max(280, newWidth), 800);
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  if (!showAI) return null;

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        "fixed right-0 top-0 z-50 h-full border-l bg-background shadow-xl transition-colors",
        isResizing ? "border-border/60" : "border-border"
      )}
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Invisible resize area on the left border */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize -translate-x-0.5"
      />
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-medium text-foreground">Scene Assistant</span>
          </div>
          <button
            onClick={() => setShowAI(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Disclaimer */}
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Responses are generated using AI and may contain mistakes.
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {messages.length === 0 ? (
            <div className="mb-4">
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">Suggestions</h4>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-sm text-violet-500 dark:text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/10 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <Message key={index} from={message.role}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <MessageResponse>{message.content}</MessageResponse>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </MessageContent>
                </Message>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSidebarSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 pr-10 text-sm text-foreground placeholder-muted-foreground focus:border-violet-500/50 focus:outline-none disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-violet-500 p-1.5 text-white hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </form>

          <button className="mt-3 flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="h-3.5 w-3.5" />
            Get help with this scene
          </button>
        </div>
      </div>
    </aside>
  );
}
