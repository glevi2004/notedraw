'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import DraggableWindow from '@/components/DraggableWindow';
import MemgroveDashboard from '@/components/graph/MemgroveDashboard';
import CursorIDE from '@/components/apps/CursorIDE';
import GeminiApp from '@/components/apps/GeminiApp';
import ChatGPTApp from '@/components/apps/ChatGPTApp';
import ClaudeApp from '@/components/apps/ClaudeApp';
import NotionApp from '@/components/apps/NotionApp';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface Window {
  id: string;
  title: string;
  type: 'memgrove' | 'cursor-ide' | 'gemini' | 'chatgpt' | 'claude' | 'notion';
  defaultPosition: { x: number; y: number };
  defaultSize: { width: number; height: number };
}

const allWindows: Window[] = [
  {
    id: 'memgrove',
    title: 'Memgrove Dashboard',
    type: 'memgrove',
    defaultPosition: { x: 760, y: 40 },
    defaultSize: { width: 500, height: 500 }
  },
  {
    id: 'cursor-ide',
    title: 'Cursor - AI Code Editor',
    type: 'cursor-ide',
    defaultPosition: { x: 100, y: 60 },
    defaultSize: { width: 900, height: 550 }
  },
  {
    id: 'gemini',
    title: 'Gemini',
    type: 'gemini',
    defaultPosition: { x: 150, y: 80 },
    defaultSize: { width: 800, height: 580 }
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    type: 'chatgpt',
    defaultPosition: { x: 200, y: 100 },
    defaultSize: { width: 850, height: 600 }
  },
  {
    id: 'claude',
    title: 'Claude',
    type: 'claude',
    defaultPosition: { x: 250, y: 120 },
    defaultSize: { width: 820, height: 580 }
  },
  {
    id: 'notion',
    title: 'Notion',
    type: 'notion',
    defaultPosition: { x: 300, y: 140 },
    defaultSize: { width: 950, height: 620 }
  }
];

// Default visible windows on load
const initialWindows: Window[] = [
  {
    id: 'memgrove',
    title: 'Memgrove Dashboard',
    type: 'memgrove',
    defaultPosition: { x: 760, y: 40 },
    defaultSize: { width: 500, height: 500 }
  },
  {
    id: 'cursor-ide',
    title: 'Cursor - AI Code Editor',
    type: 'cursor-ide',
    defaultPosition: { x: 100, y: 60 },
    defaultSize: { width: 800, height: 550 }
  }
];

export default function DesktopEditorDemo() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [windows, setWindows] = useState<Window[]>(initialWindows);
  const [zIndices, setZIndices] = useState<Record<string, number>>({
    memgrove: 1,
    'cursor-ide': 2
  });
  const [highestZ, setHighestZ] = useState(1);

  const bringToFront = useCallback((windowId: string) => {
    setZIndices(prev => ({
      ...prev,
      [windowId]: highestZ + 1
    }));
    setHighestZ(prev => prev + 1);
  }, [highestZ]);

  const closeWindow = useCallback((windowId: string) => {
    setWindows(prev => prev.filter(w => w.id !== windowId));
  }, []);

  const openWindow = useCallback((windowId: string) => {
    const windowConfig = allWindows.find(w => w.id === windowId);
    if (!windowConfig) return;

    // Check if window already exists
    const exists = windows.some(w => w.id === windowId);
    
    if (!exists) {
      // Prevent scroll when adding new window
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // Add the window
      setWindows(prev => [...prev, windowConfig]);
      // Add z-index for the new window
      setZIndices(prev => ({
        ...prev,
        [windowId]: highestZ + 1
      }));
      setHighestZ(prev => prev + 1);
      
      // Restore scroll position
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
    } else {
      // Bring existing window to front
      bringToFront(windowId);
    }
  }, [windows, highestZ, bringToFront]);

  const renderWindowContent = (type: string) => {
    switch (type) {
      case 'memgrove':
        return <MemgroveDashboard />;
      case 'cursor-ide':
        return <CursorIDE />;
      case 'gemini':
        return <GeminiApp />;
      case 'chatgpt':
        return <ChatGPTApp />;
      case 'claude':
        return <ClaudeApp />;
      case 'notion':
        return <NotionApp />;
      default:
        return null;
    }
  };

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Desktop Container with Painting Background - Always the same */}
        <div 
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            height: '700px',
            // Classic painting-like background - same in both modes (like cursor.com)
            background: `
              linear-gradient(135deg, 
                #d4c5b5 0%, 
                #c9b8a5 15%,
                #c4b3a0 30%,
                #d1c0ad 45%,
                #c7b6a3 60%,
                #d0bfac 75%,
                #cbbba8 90%,
                #d5c4b2 100%
              )
            `,
          }}
        >
          {/* Subtle texture overlay for painting effect */}
          <div 
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 25% 20%, rgba(180, 160, 140, 0.4) 0%, transparent 50%),
                radial-gradient(ellipse at 75% 80%, rgba(160, 140, 120, 0.3) 0%, transparent 40%),
                radial-gradient(ellipse at 50% 50%, rgba(200, 180, 160, 0.2) 0%, transparent 60%)
              `,
            }}
          />

          {/* Desktop Icons - Top Left Column */}
          <div className="absolute top-4 left-4 flex flex-col gap-3 z-0">
            {/* Memgrove */}
            <div 
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openWindow('memgrove');
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg p-1.5 overflow-visible">
                <Image
                  src="/logo-black.png"
                  alt="Memgrove"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] text-gray-800 font-medium drop-shadow-sm">Memgrove</span>
            </div>

            {/* Cursor IDE */}
            <div 
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openWindow('cursor-ide');
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shadow-lg p-1.5">
                <Image
                  src="/provider-logos/cursor/CUBE_25D.svg"
                  alt="Cursor"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] text-gray-800 font-medium drop-shadow-sm">Cursor</span>
            </div>

            {/* Gemini */}
            <div 
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-colors"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openWindow('gemini');
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg p-1.5">
                <Image
                  src="/provider-logos/gemini/icon-logo.png"
                  alt="Gemini"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] text-gray-800 font-medium drop-shadow-sm">Gemini</span>
            </div>

            {/* ChatGPT */}
            <div 
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openWindow('chatgpt');
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg p-0.5">
                <Image
                  src="/provider-logos/openai/OpenAI-black-monoblossom.svg"
                  alt="ChatGPT"
                  width={44}
                  height={44}
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] text-gray-800 font-medium drop-shadow-sm">ChatGPT</span>
            </div>

            {/* Claude */}
            <div 
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openWindow('claude');
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#d97757] flex items-center justify-center shadow-lg p-1.5">
                <Image
                  src="/provider-logos/claude/claude.png"
                  alt="Claude"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] text-gray-800 font-medium drop-shadow-sm">Claude</span>
            </div>

            {/* Notion */}
            <div 
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openWindow('notion');
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg p-1.5">
                <Image
                  src="/provider-logos/notion/notion.png"
                  alt="Notion"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] text-gray-800 font-medium drop-shadow-sm">Notion</span>
            </div>

          </div>

          {/* Draggable Windows */}
          {windows.map((window) => (
            <DraggableWindow
              key={window.id}
              id={window.id}
              title={window.title}
              defaultPosition={window.defaultPosition}
              defaultSize={window.defaultSize}
              zIndex={zIndices[window.id] || 1}
              onFocus={() => bringToFront(window.id)}
              onClose={() => closeWindow(window.id)}
              minWidth={320}
              minHeight={300}
            >
              {renderWindowContent(window.type)}
            </DraggableWindow>
          ))}

          {/* Desktop Hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-700/80 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full font-medium">
            Click icons to open apps • Drag windows to reorder • Resize from edges
          </div>
        </div>

        {/* Caption */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="font-medium">AI Apps at Your Fingertips</span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            Access Cursor, Gemini, ChatGPT, Claude, and Notion directly from your Memgrove desktop
          </p>
          <p className="text-xs text-muted-foreground/70">
            All conversations are saved to your knowledge graph for future reference.
          </p>
          <a 
            href="#features" 
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline mt-4"
          >
            Explore Features
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
