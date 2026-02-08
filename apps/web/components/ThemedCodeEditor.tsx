'use client';

import { Highlight, themes } from 'prism-react-renderer';
import { useTheme } from '@/context/ThemeContext';
import { FileCode, X, ChevronRight, Search, Loader2, Bot, Send } from 'lucide-react';
import { useState } from 'react';

interface ThemedCodeEditorProps {
  code: string;
  language?: string;
  fileName?: string;
  showLineNumbers?: boolean;
  addedLines?: number[];
  removedLines?: number[];
}

export default function ThemedCodeEditor({
  code,
  language = 'python',
  fileName = 'untitled',
  showLineNumbers = true,
  addedLines = [],
  removedLines = []
}: ThemedCodeEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Light theme colors for code editor
  const lightTheme = {
    plain: {
      color: '#24292e',
      backgroundColor: '#fafafa',
    },
    styles: [
      { types: ['comment'], style: { color: '#6a737d' } },
      { types: ['string'], style: { color: '#032f62' } },
      { types: ['number'], style: { color: '#005cc5' } },
      { types: ['keyword'], style: { color: '#d73a49' } },
      { types: ['function'], style: { color: '#6f42c1' } },
      { types: ['operator'], style: { color: '#d73a49' } },
      { types: ['punctuation'], style: { color: '#24292e' } },
      { types: ['class-name'], style: { color: '#6f42c1' } },
      { types: ['builtin'], style: { color: '#005cc5' } },
    ],
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]'}`}>
      {/* File Tab */}
      <div className={`flex items-center border-b ${isDark ? 'bg-[#252526] border-white/5' : 'bg-[#f0f0f0] border-black/5'}`}>
        <div className={`flex items-center gap-2 px-3 py-2 text-xs border-r ${isDark ? 'bg-[#1e1e1e] text-gray-300 border-white/5' : 'bg-[#fafafa] text-gray-700 border-black/5'}`}>
          <FileCode className="w-3.5 h-3.5 text-blue-500" />
          <span>{fileName}</span>
          <X className={`w-3 h-3 cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-black'}`} />
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto">
        <Highlight 
          theme={isDark ? themes.vsDark : lightTheme} 
          code={code.trim()} 
          language={language}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              className={`${className} font-mono text-[12px] leading-relaxed`} 
              style={{ 
                ...style, 
                background: 'transparent',
                margin: 0,
                padding: '12px 0'
              }}
            >
              {tokens.map((line, i) => {
                const isAdded = addedLines.includes(i);
                const isRemoved = removedLines.includes(i);
                
                return (
                  <div 
                    key={i} 
                    {...getLineProps({ line })} 
                    className={`
                      flex
                      ${isAdded ? (isDark ? 'bg-green-500/15' : 'bg-green-100') : ''}
                      ${isRemoved ? (isDark ? 'bg-red-500/15' : 'bg-red-100') : ''}
                      ${isAdded || isRemoved ? 'border-l-2' : ''}
                      ${isAdded ? 'border-l-green-500' : ''}
                      ${isRemoved ? 'border-l-red-500' : ''}
                    `}
                    style={{ paddingLeft: showLineNumbers ? '8px' : '16px' }}
                  >
                    {showLineNumbers && (
                      <span className={`select-none w-8 text-right mr-4 text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        {i + 1}
                      </span>
                    )}
                    <span className="flex-1">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}

// Chat Interface Component
export function ChatInterface({ 
  title, 
  description 
}: { 
  title: string; 
  description: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [inputValue, setInputValue] = useState('');

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]'}`}>
      {/* Chat Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'bg-[#252526] border-white/5' : 'bg-[#f0f0f0] border-black/5'}`}>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-500" />
          <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cursor Agent</span>
        </div>
        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>~/Repos/ml-research-notebook</span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="flex-1">
            <p className={`text-sm mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{title}</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            <Search className="w-3.5 h-3.5" />
            <span>Searched PyTorch mixed precision training best practices</span>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            <FileCode className="w-3.5 h-3.5" />
            <span>Reading notebooks/train_model.py (current implementation)</span>
          </div>
        </div>

        <div className={`rounded-lg p-3 border ${isDark ? 'bg-[#252526] border-white/5' : 'bg-white border-black/5'}`}>
          <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            I'll enhance your MNIST trainer with a complete experiment framework including mixed precision training, 
            validation split, and proper configuration management.
          </p>
          <div className="flex items-center gap-2 text-xs text-green-500">
            <FileCode className="w-3.5 h-3.5" />
            <span>train_model.py</span>
            <span className="text-green-600">+156 -34</span>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className={`p-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${isDark ? 'bg-[#252526] border-white/5' : 'bg-white border-black/10'}`}>
          <input
            type="text"
            placeholder="Plan, search, build anything..."
            className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-gray-200 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button className="p-1.5 bg-purple-500/20 rounded-md hover:bg-purple-500/30 transition-colors">
            <Send className="w-4 h-4 text-purple-500" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-2">
            <button className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'}`}>
              <Bot className="w-3 h-3" />
              Agent
            </button>
            <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>·</span>
            <button className={`text-[10px] ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'}`}>
              GPT-5.2
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Agent Panel Component
export function AgentPanel() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#252526]' : 'bg-[#f5f5f5]'}`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'bg-[#2d2d2d] border-white/5' : 'bg-[#e8e8e8] border-black/5'}`}>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-500" />
          <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>agent</span>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-auto">
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 animate-pulse" />
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Thinking</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>10 seconds</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Searched</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>PyTorch mixed precision training best practices</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Loader2 className="w-3.5 h-3.5 text-yellow-400 mt-0.5 animate-spin" />
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Reading</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>notebooks/train_model.py (current implementation)</p>
          </div>
        </div>
      </div>
      <div className={`px-3 py-2 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className={`flex items-center justify-between text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <span>GPT-5.2</span>
          <span>/ for commands · @ for files</span>
        </div>
      </div>
    </div>
  );
}

// Task List Component
export function TaskList() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const tasks = [
    { id: '1', title: 'Enterprise Order Management System', status: 'in-progress' as const },
    { id: '2', title: 'Analyze Tab and Agent Usage Patterns', status: 'in-progress' as const },
    { id: '3', title: 'PyTorch MNIST Experiment', status: 'in-progress' as const },
    { id: '4', title: 'Fix PR Comment Fetching Issue', status: 'in-progress' as const },
  ];

  const readyForReview = [
    { id: '5', title: 'Set up Cursor Rules for Dashboard', time: '30m', additions: 37, deletions: 0 },
    { id: '6', title: 'Bioinformatics Tools', time: '45m', additions: 135, deletions: 21 },
  ];

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#252526]' : 'bg-[#f5f5f5]'}`}>
      <div className={`p-3 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className={`flex items-center gap-2 text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <span className="font-medium">In Progress</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>4</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={`px-3 py-2 cursor-pointer group ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
          >
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{task.title}</p>
                <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Generating...</span>
              </div>
            </div>
          </div>
        ))}
        
        <div className={`p-3 border-t mt-2 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className={`flex items-center gap-2 text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="font-medium">Ready for Review</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>2</span>
          </div>
        </div>
        {readyForReview.map((task) => (
          <div 
            key={task.id} 
            className={`px-3 py-2 cursor-pointer ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
          >
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                <ChevronRight className="w-3 h-3 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{task.time}</span>
                  <span className="text-[10px] text-green-500">+{task.additions}</span>
                  <span className="text-[10px] text-red-500">-{task.deletions}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
