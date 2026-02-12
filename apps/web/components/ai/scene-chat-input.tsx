"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { useSceneAI } from "./scene-ai-context";

export function SceneChatInput() {
  const { showInput, sendMessage } = useSceneAI();
  const [centerInputValue, setCenterInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleCenterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (centerInputValue.trim()) {
      sendMessage(centerInputValue);
      setCenterInputValue("");
    }
  };

  // Don't show when input is not active
  if (!showInput) return null;

  return (
    <div 
      className="absolute bottom-6 left-1/2 z-40 w-full px-4 pointer-events-none" 
      style={{ transform: "translateX(-50%)" }}
    >
      <motion.form
        onSubmit={handleCenterSubmit}
        onClick={(e) => {
          e.stopPropagation();
          setIsInputFocused(true);
        }}
        initial={{ maxWidth: "360px", opacity: 0, y: 20 }}
        animate={{ 
          maxWidth: isInputFocused || centerInputValue.trim() ? "420px" : "360px",
          opacity: 1,
          y: 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="mx-auto flex w-full items-center gap-3 rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-4 shadow-lg pointer-events-auto"
      >
        <input
          type="text"
          value={centerInputValue}
          onChange={(e) => setCenterInputValue(e.target.value)}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => {
            // Use setTimeout to allow form onClick to fire first
            setTimeout(() => {
              if (!centerInputValue.trim()) {
                setIsInputFocused(false);
              }
            }, 200);
          }}
          placeholder="Ask AI about your scene..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none py-1"
          autoFocus
        />
        <kbd className="text-xs text-muted-foreground font-mono">⌘I</kbd>
        <button 
          type="submit"
          className="rounded-full bg-violet-500 p-1.5 text-white hover:bg-violet-600 transition-colors"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </motion.form>
    </div>
  );
}
