"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SceneAIContextType {
  showAI: boolean;
  setShowAI: (show: boolean) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sendMessage: (message: string) => Promise<void>;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}

const SceneAIContext = createContext<SceneAIContextType | undefined>(undefined);

const aiSuggestions = [
  "Help me organize this diagram",
  "Suggest improvements for this layout",
  "Explain what this diagram represents",
];

export { aiSuggestions };

export function SceneAIProvider({ children }: { children: ReactNode }) {
  const [showAI, setShowAI] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: message.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Add empty assistant message for streaming
    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/scene-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data && data !== "[DONE]") {
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.content;
                    if (content) {
                      accumulatedContent += content;
                      setMessages((prev) => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = {
                          role: "assistant",
                          content: accumulatedContent,
                        };
                        return newMessages;
                      });
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            if (data) {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.content;
                if (content) {
                  accumulatedContent += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: accumulatedContent,
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  return (
    <SceneAIContext.Provider value={{ 
      showAI, 
      setShowAI,
      messages,
      setMessages,
      inputValue,
      setInputValue,
      isLoading,
      setIsLoading,
      sendMessage,
      sidebarWidth,
      setSidebarWidth
    }}>
      {children}
    </SceneAIContext.Provider>
  );
}

export function useSceneAI() {
  const context = useContext(SceneAIContext);
  if (!context) {
    throw new Error("useSceneAI must be used within SceneAIProvider");
  }
  return context;
}
