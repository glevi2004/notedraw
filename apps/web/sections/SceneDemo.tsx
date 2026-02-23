'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { FooterRight } from '@excalidraw/excalidraw';
import { useTheme } from '@/context/ThemeContext';
import { Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  SceneAIContext,
  useSceneAI,
  SceneChatInput,
  SceneChatBubble,
} from '@/components/ai';
import type { SceneAIContextType } from '@/components/ai';
import type { ChatMessage, SceneChatActivity } from '@/components/ai/scene-chat-types';
import { cn } from '@/lib/utils';

const ExcalidrawWithNotes = dynamic(
  async () => {
    const mod = await import('@/components/note');
    return { default: mod.ExcalidrawWithNotes };
  },
  { ssr: false },
);

const STORAGE_KEY = 'notedraw-demo-scene';
const AI_COUNT_KEY = 'notedraw-demo-ai-count';
const MAX_FREE_AI = 5;

const mockResponses = [
  "Great start! Try grouping related elements together to make the diagram easier to follow.",
  "Nice layout! You could add arrows between elements to show the flow of information.",
  "Looking good! Consider adding notes to explain the purpose of each section.",
  "Tip: Use different colors to categorize elements — it makes diagrams much more scannable.",
  "Your scene is coming together! Try using frames to organize related elements into groups.",
];

const LIMIT_MESSAGE =
  "You've used all 5 free AI requests. Sign up to unlock unlimited AI assistance for your scenes.";

function getStoredScene(): { elements: any[]; appState: any; files: any } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function getAiCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(AI_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function setAiCount(count: number) {
  try {
    localStorage.setItem(AI_COUNT_KEY, String(count));
  } catch {}
}

const createMessageId = (): string =>
  `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Provides the same SceneAIContext that SceneChatInput and SceneChatBubble
 * consume, but with mock AI responses and a 5-request limit instead of
 * hitting the real API.
 */
function DemoSceneAIProvider({ children }: { children: React.ReactNode }) {
  const [showChatBubble, setShowChatBubble] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activities, setActivities] = useState<SceneChatActivity[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        role: 'user',
        content: trimmed,
      };

      const count = getAiCount();

      // Over the limit — immediate static reply
      if (count >= MAX_FREE_AI) {
        const limitMsg: ChatMessage = {
          id: createMessageId(),
          role: 'assistant',
          content: LIMIT_MESSAGE,
        };
        setMessages((prev) => [...prev, userMessage, limitMsg]);
        setInputValue('');
        setShowInput(false);
        setShowChatBubble(true);
        return;
      }

      const assistantId = createMessageId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInputValue('');
      setIsLoading(true);
      setShowInput(false);
      setShowChatBubble(true);
      setActivities([]);

      // Simulate a short delay then respond
      const newCount = count + 1;
      setAiCount(newCount);

      const responseText =
        newCount >= MAX_FREE_AI
          ? mockResponses[count % mockResponses.length] +
            '\n\n' +
            LIMIT_MESSAGE
          : mockResponses[count % mockResponses.length];

      await new Promise((r) => setTimeout(r, 800));

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: responseText } : m)),
      );
      setIsLoading(false);
    },
    [isLoading],
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

  return (
    <SceneAIContext.Provider value={value}>{children}</SceneAIContext.Provider>
  );
}

/** AI toggle button — mirrors the one in SceneEditor */
function DemoSceneAIButton() {
  const { showChatBubble, showInput, setShowInput, setShowChatBubble } = useSceneAI();

  const handleClick = () => {
    if (showInput) {
      setShowInput(false);
      setShowChatBubble(true);
    } else if (showChatBubble) {
      setShowChatBubble(false);
    } else {
      setShowInput(true);
    }
  };

  const buttonText = showInput ? 'AI Chat' : 'Ask AI';
  const isActive = showChatBubble || showInput;

  return (
    <button
      className={cn(
        'transition-colors relative z-50 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent',
        isActive && 'text-violet-500 bg-violet-500/10 border-violet-500/30',
      )}
      type="button"
      title={buttonText}
      aria-label={buttonText}
      onClick={handleClick}
    >
      <span className="text-sm font-medium whitespace-nowrap">{buttonText}</span>
      <Sparkles size={18} />
    </button>
  );
}

export default function SceneDemo() {
  const { theme } = useTheme();
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle clicks outside the scene to deactivate it
  useEffect(() => {
    if (!isInteractive) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsInteractive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isInteractive]);

  const initialData = useMemo(() => {
    const stored = getStoredScene();
    if (stored) return stored;
    return { elements: [], appState: {}, files: {} };
  }, []);

  const handleChange = useCallback(() => {
    const api = excalidrawRef.current;
    if (!api) return;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          elements: Array.from(elements),
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
          },
          files,
        }),
      );
    } catch {}
  }, []);

  const handleActivate = useCallback(() => {
    setIsInteractive(true);
  }, []);

  const uiOptions = useMemo(
    () => ({
      canvasActions: {
        changeViewBackgroundColor: true,
        clearCanvas: true,
        export: false,
        loadScene: false,
        saveToActiveFile: false,
        toggleTheme: false,
        saveAsImage: false,
      },
    }),
    [],
  );

  return (
    <section className="w-full px-3 sm:px-32 pb-20" id="demo">
      {/* Full-bleed canvas — matches Cluely app preview proportions */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl border border-border shadow-2xl"
        style={{ height: 'clamp(480px, 72vh, 860px)' }}
        onClick={!isInteractive ? handleActivate : undefined}
        onMouseDown={(e) => {
          if (isInteractive) e.stopPropagation();
        }}
      >
        {mounted && (
          <DemoSceneAIProvider>
            <div className="w-full h-full relative">
              <ExcalidrawWithNotes
                excalidrawRef={excalidrawRef}
                initialData={initialData}
                onChange={handleChange}
                theme={theme === 'dark' ? 'dark' : 'light'}
                gridModeEnabled={false}
                UIOptions={uiOptions}
              >
                <FooterRight>
                  <DemoSceneAIButton />
                </FooterRight>
              </ExcalidrawWithNotes>
              <SceneChatInput />
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <SceneChatBubble />
              </div>
            </div>
            {/* Transparent overlay that blocks all events when not interactive */}
            {!isInteractive && (
              <div
                className="absolute inset-0 z-50 cursor-pointer"
                onClick={handleActivate}
                onWheel={(e) => {
                  // Prevent wheel events from reaching Excalidraw
                  e.stopPropagation();
                  // Allow page scrolling to continue
                }}
                onMouseDown={(e) => {
                  // Prevent any mouse events from reaching Excalidraw
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  // Prevent touch events from reaching Excalidraw
                  e.stopPropagation();
                }}
              />
            )}
          </DemoSceneAIProvider>
        )}
      </div>
    </section>
  );
}
