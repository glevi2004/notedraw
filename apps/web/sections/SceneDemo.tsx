'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTheme } from '@/context/ThemeContext';
import { ArrowUp, Sparkles } from 'lucide-react';
import { SignUpButton, SignedOut, SignedIn } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import Link from 'next/link';

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

interface DemoChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function DemoChatInput({
  messages,
  onSend,
}: {
  messages: DemoChatMessage[];
  onSend: (msg: string) => void;
}) {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <div
      className="absolute bottom-6 left-1/2 z-40 w-full px-4 pointer-events-none"
      style={{ transform: 'translateX(-50%)' }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex w-full max-w-[420px] items-center gap-3 rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-4 shadow-lg pointer-events-auto"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask AI about your scene..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none py-1"
        />
        <button
          type="submit"
          className="rounded-full bg-violet-500 p-1.5 text-white hover:bg-violet-600 transition-colors"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function DemoChatBubble({
  messages,
  limitReached,
}: {
  messages: DemoChatMessage[];
  limitReached: boolean;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-40 w-80 max-h-[400px] flex flex-col rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-medium">AI Chat</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {Math.min(getAiCount(), MAX_FREE_AI)}/{MAX_FREE_AI} free
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm ${
              msg.role === 'user'
                ? 'text-foreground ml-8'
                : 'text-muted-foreground mr-4'
            }`}
          >
            {msg.role === 'assistant' && (
              <span className="text-violet-500 font-medium text-xs block mb-1">AI</span>
            )}
            <p className={`${
              msg.role === 'user'
                ? 'bg-violet-500/10 rounded-lg px-3 py-2 text-right'
                : 'bg-secondary rounded-lg px-3 py-2'
            }`}>
              {msg.content}
            </p>
          </div>
        ))}
        {limitReached && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-violet-600 dark:text-violet-400 mb-2">
              Sign up to unlock unlimited AI
            </p>
            <SignedOut>
              <SignUpButton mode="modal">
                <Button size="sm" className="bg-violet-500 text-white hover:bg-violet-600 rounded-full px-4">
                  Sign up free
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button size="sm" className="bg-violet-500 text-white hover:bg-violet-600 rounded-full px-4">
                  Go to Dashboard
                </Button>
              </Link>
            </SignedIn>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default function SceneDemo() {
  const { theme } = useTheme();
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [messages, setMessages] = useState<DemoChatMessage[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLimitReached(getAiCount() >= MAX_FREE_AI);
  }, []);

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

  const handleSendMessage = useCallback(
    (text: string) => {
      const userMsg: DemoChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: text,
      };

      const count = getAiCount();

      if (count >= MAX_FREE_AI) {
        const limitMsg: DemoChatMessage = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content:
            "You've used all 5 free AI requests. Sign up to unlock unlimited AI assistance for your scenes.",
        };
        setMessages((prev) => [...prev, userMsg, limitMsg]);
        setLimitReached(true);
        return;
      }

      const newCount = count + 1;
      setAiCount(newCount);

      const responseText = mockResponses[count % mockResponses.length];
      const assistantMsg: DemoChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: responseText,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      if (newCount >= MAX_FREE_AI) {
        setLimitReached(true);
      }
    },
    [],
  );

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
    <section className="py-8 px-4 sm:px-6 lg:px-8" id="demo">
      <div className="max-w-7xl mx-auto">
        {/* Scene Container */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl border border-border"
          style={{ height: '600px' }}
        >
          {mounted && (
            <ExcalidrawWithNotes
              excalidrawRef={excalidrawRef}
              initialData={initialData}
              onChange={handleChange}
              theme={theme === 'dark' ? 'dark' : 'light'}
              gridModeEnabled={false}
              UIOptions={uiOptions}
            />
          )}
          {/* Demo AI Chat */}
          <DemoChatInput messages={messages} onSend={handleSendMessage} />
          <DemoChatBubble messages={messages} limitReached={limitReached} />
        </div>

        {/* Caption */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <span className="font-medium">Try Notedraw</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Draw, add notes, and ask AI — your work saves locally in this demo
          </p>
        </div>
      </div>
    </section>
  );
}
