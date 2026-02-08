'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { 
  Files, 
  Search, 
  GitBranch, 
  Bug, 
  Puzzle,
  Settings,
  ChevronRight,
  ChevronDown,
  FileCode,
  Folder,
  FolderOpen,
  Send,
  Bot,
  Sparkles,
  MoreHorizontal,
  X,
  Plus
} from 'lucide-react';

// File tree structure
interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
}

const fileTree: FileNode[] = [
  {
    name: 'project',
    type: 'folder',
    isOpen: true,
    children: [
      {
        name: 'src',
        type: 'folder',
        isOpen: true,
        children: [
          { name: 'components', type: 'folder', children: [
            { name: 'App.tsx', type: 'file' },
            { name: 'Header.tsx', type: 'file' },
          ]},
          { name: 'utils', type: 'folder', children: [
            { name: 'helpers.ts', type: 'file' },
          ]},
          { name: 'main.ts', type: 'file' },
        ]
      },
      { name: 'public', type: 'folder', children: [] },
      { name: 'package.json', type: 'file' },
      { name: 'tsconfig.json', type: 'file' },
    ]
  }
];

const sampleCode = `import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Initialize the application
const root = createRoot(
  document.getElementById('root')!
);

root.render(<App />);

// Enable hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}`;

export default function CursorIDE() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('main.ts');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['project', 'src', 'components']));
  const [chatInput, setChatInput] = useState('');

  const toggleFolder = (name: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.name} style={{ paddingLeft: depth * 12 }}>
        <div
          className={`flex items-center gap-1 py-1 px-2 cursor-pointer text-xs ${
            isDark 
              ? 'hover:bg-white/5 text-gray-300' 
              : 'hover:bg-black/5 text-gray-700'
          }`}
          onClick={() => node.type === 'folder' && toggleFolder(node.name)}
        >
          {node.type === 'folder' ? (
            <>
              {expandedFolders.has(node.name) ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              )}
              {expandedFolders.has(node.name) ? (
                <FolderOpen className="w-4 h-4 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 text-blue-400" />
              )}
            </>
          ) : (
            <>
              <span className="w-3" />
              <FileCode className="w-4 h-4 text-yellow-500" />
            </>
          )}
          <span className={node.type === 'folder' ? 'font-medium' : ''}>{node.name}</span>
        </div>
        {node.type === 'folder' && expandedFolders.has(node.name) && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]'}`}>
      {/* Title Bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 text-xs ${
        isDark ? 'bg-[#181818] text-gray-400' : 'bg-[#e8e8e8] text-gray-600'
      }`}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="ml-2">main.ts — project</span>
        </div>
        <div className="flex items-center gap-3">
          <Bot className="w-3.5 h-3.5" />
          <Settings className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className={`w-12 flex flex-col items-center py-2 gap-1 ${
          isDark ? 'bg-[#181818] border-r border-white/5' : 'bg-[#e8e8e8] border-r border-black/5'
        }`}>
          <button className={`p-2 rounded-md ${isDark ? 'text-white bg-white/10' : 'text-gray-800 bg-black/10'}`}>
            <Files className="w-5 h-5" />
          </button>
          <button className={`p-2 rounded-md ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
            <Search className="w-5 h-5" />
          </button>
          <button className={`p-2 rounded-md ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
            <GitBranch className="w-5 h-5" />
          </button>
          <button className={`p-2 rounded-md ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
            <Bug className="w-5 h-5" />
          </button>
          <button className={`p-2 rounded-md ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
            <Puzzle className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className={`p-2 rounded-md ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar - File Explorer */}
        <div className={`w-56 flex flex-col ${
          isDark ? 'bg-[#1e1e1e] border-r border-white/5' : 'bg-[#f5f5f5] border-r border-black/5'
        }`}>
          <div className={`flex items-center justify-between px-3 py-2 text-xs font-medium ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span>EXPLORER</span>
            <MoreHorizontal className="w-4 h-4" />
          </div>
          <div className="flex-1 overflow-auto py-1">
            {renderFileTree(fileTree)}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className={`flex items-center text-xs ${
            isDark ? 'bg-[#1e1e1e] border-b border-white/5' : 'bg-[#f0f0f0] border-b border-black/5'
          }`}>
            <div className={`flex items-center gap-2 px-3 py-2 border-r ${
              isDark 
                ? 'bg-[#1e1e1e] text-gray-300 border-white/5' 
                : 'bg-white text-gray-700 border-black/5'
            }`}>
              <FileCode className="w-3.5 h-3.5 text-yellow-500" />
              <span>main.ts</span>
              <X className="w-3 h-3 cursor-pointer hover:text-red-400" />
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 border-r ${
              isDark 
                ? 'bg-[#181818] text-gray-500 border-white/5' 
                : 'bg-[#e8e8e8] text-gray-500 border-black/5'
            }`}>
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              <span>App.tsx</span>
              <X className="w-3 h-3 cursor-pointer hover:text-red-400" />
            </div>
            <div className="flex-1" />
            <div className="px-2">
              <Plus className="w-4 h-4 text-gray-500 cursor-pointer" />
            </div>
          </div>

          {/* Code Editor */}
          <div className={`flex-1 overflow-auto p-4 font-mono text-sm ${
            isDark ? 'bg-[#1e1e1e] text-gray-300' : 'bg-white text-gray-800'
          }`}>
            <pre className="leading-relaxed">
              <code>{sampleCode}</code>
            </pre>
          </div>
        </div>

        {/* Right Panel - Agent Chat */}
        <div className={`w-72 flex flex-col border-l ${
          isDark ? 'bg-[#1e1e1e] border-white/5' : 'bg-[#fafafa] border-black/5'
        }`}>
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${
            isDark ? 'border-white/5' : 'border-black/5'
          }`}>
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Cursor Agent
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-auto p-3 space-y-3">
            <div className={`rounded-lg p-3 ${
              isDark ? 'bg-[#252526]' : 'bg-white border border-black/5'
            }`}>
              <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                I&apos;ll help you set up the React application with proper TypeScript configuration and HMR support.
              </p>
              <div className="flex items-center gap-2 text-[10px] text-green-500">
                <FileCode className="w-3 h-3" />
                <span>main.ts</span>
                <span className="text-green-600">+12 -3</span>
              </div>
            </div>

            <div className={`flex items-start gap-2`}>
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Would you like me to add routing and state management to this setup?
                </p>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className={`p-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
              isDark 
                ? 'bg-[#252526] border-white/10' 
                : 'bg-white border-black/10'
            }`}>
              <input
                type="text"
                placeholder="Ask anything..."
                className={`flex-1 bg-transparent text-xs outline-none ${
                  isDark ? 'text-gray-200 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                }`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button className="p-1 bg-purple-500/20 rounded hover:bg-purple-500/30">
                <Send className="w-3.5 h-3.5 text-purple-500" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                GPT-4o
              </span>
              <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                @ to mention files
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
