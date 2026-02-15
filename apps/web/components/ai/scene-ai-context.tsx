"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { streamSceneChatEvents } from "./scene-ai-events";
import type {
  ChatMessage,
  SceneChatActivity,
  ScenePatchHandler,
} from "./scene-chat-types";

interface SceneAIContextType {
  showChatBubble: boolean;
  setShowChatBubble: (show: boolean) => void;
  showInput: boolean;
  setShowInput: (show: boolean) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activities: SceneChatActivity[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sendMessage: (message: string) => Promise<void>;
  openChat: () => void;
  closeChat: () => void;
}

type SceneAIProviderProps = {
  children: ReactNode;
  workspaceId: string;
  sceneId: string;
  onScenePatch?: ScenePatchHandler;
};

const SceneAIContext = createContext<SceneAIContextType | undefined>(undefined);

const createMessageId = (): string =>
  `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createActivityId = (): string =>
  `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const aiSuggestions = [
  "Help me organize this diagram",
  "Suggest improvements for this layout",
  "Explain what this diagram represents",
];

export { aiSuggestions };

export function SceneAIProvider({
  children,
  workspaceId,
  sceneId,
  onScenePatch,
}: SceneAIProviderProps) {
  const [showChatBubble, setShowChatBubble] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activities, setActivities] = useState<SceneChatActivity[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const appendActivity = useCallback(
    (type: SceneChatActivity["type"], label: string, detail?: string) => {
      setActivities((prev) => [
        ...prev,
        {
          id: createActivityId(),
          type,
          label,
          detail,
          createdAt: Date.now(),
        },
      ]);
    },
    [],
  );

  const updateAssistantMessage = useCallback((assistantId: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantId ? { ...message, content } : message,
      ),
    );
  }, []);

  const openChat = useCallback(() => {
    setShowInput(true);
    setShowChatBubble(false);
  }, []);

  const closeChat = useCallback(() => {
    setShowInput(false);
    setShowChatBubble(false);
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      const trimmed = message.trim();
      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
      };
      const assistantId = createMessageId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      const requestMessages = [...messages, userMessage];
      setMessages([...requestMessages, assistantMessage]);

      setInputValue("");
      setIsLoading(true);
      setShowInput(false);
      setShowChatBubble(true);
      setActivities([]);

      let assistantText = "";

      try {
        const response = await fetch("/api/ai/scene-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            sceneId,
            mode: "mutate",
            allowMutations: true,
            messages: requestMessages.map(({ role, content }) => ({ role, content })),
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string; code?: string; requestId?: string }
            | null;
          const details = [body?.code, body?.requestId].filter(Boolean).join(" / ");
          throw new Error(
            `${body?.error || `Scene chat request failed (${response.status})`}${
              details ? ` (${details})` : ""
            }`,
          );
        }

        if (!response.body) {
          throw new Error("Scene chat response did not include a stream.");
        }

        for await (const event of streamSceneChatEvents(response.body)) {
          if (event.type === "token") {
            assistantText += event.content;
            updateAssistantMessage(assistantId, assistantText);
            continue;
          }

          if (event.type === "tool_start") {
            appendActivity(
              "tool_start",
              `Running ${event.toolName}`,
              JSON.stringify(event.input),
            );
            continue;
          }

          if (event.type === "tool_result") {
            appendActivity(
              "tool_result",
              `${event.toolName} completed`,
              JSON.stringify(event.output),
            );
            continue;
          }

          if (event.type === "scene_patch") {
            appendActivity(
              "scene_patch",
              `Applying scene patch (${event.patch.ops.length} ops)`,
              `Scene version ${event.sceneVersion}`,
            );
            if (onScenePatch) {
              const applied = await onScenePatch(event.patch, event.sceneVersion);
              if (!applied.ok) {
                appendActivity(
                  "error",
                  "Scene patch rejected",
                  applied.error || "Patch apply failed",
                );
              }
            }
            continue;
          }

          if (event.type === "warning") {
            appendActivity("warning", event.message, event.code);
            continue;
          }

          if (event.type === "error") {
            appendActivity("error", event.message, event.code);
            if (!assistantText) {
              assistantText = event.message;
              updateAssistantMessage(assistantId, assistantText);
            }
            continue;
          }
        }
      } catch (error) {
        const messageText =
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.";

        appendActivity("error", messageText);

        if (!assistantText) {
          assistantText = messageText;
          updateAssistantMessage(assistantId, assistantText);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      appendActivity,
      isLoading,
      messages,
      onScenePatch,
      sceneId,
      updateAssistantMessage,
      workspaceId,
    ],
  );

  const value = useMemo<SceneAIContextType>(
    () => ({
      showChatBubble,
      setShowChatBubble,
      showInput,
      setShowInput,
      messages,
      setMessages,
      activities,
      inputValue,
      setInputValue,
      isLoading,
      setIsLoading,
      sendMessage,
      openChat,
      closeChat,
    }),
    [
      activities,
      closeChat,
      inputValue,
      isLoading,
      messages,
      openChat,
      sendMessage,
      showChatBubble,
      showInput,
    ],
  );

  return <SceneAIContext.Provider value={value}>{children}</SceneAIContext.Provider>;
}

export function useSceneAI() {
  const context = useContext(SceneAIContext);
  if (!context) {
    throw new Error("useSceneAI must be used within SceneAIProvider");
  }
  return context;
}
