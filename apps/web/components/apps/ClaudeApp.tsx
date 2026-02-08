'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';
import { 
  ArrowUp,
  Plus,
  Clock,
  Star,
  Settings,
  HelpCircle,
  Paperclip,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ChevronDown
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Help me analyze this dataset and create visualizations',
    timestamp: new Date()
  },
  {
    id: '2',
    role: 'assistant',
    content: `I'd be happy to help you analyze your dataset and create meaningful visualizations! Here's how I can assist:

**Data Analysis Steps:**

1. **Exploratory Data Analysis (EDA)**
   • Understand data structure and types
   • Identify missing values and outliers
   • Calculate summary statistics

2. **Visualization Options**
   • Histograms for distribution analysis
   • Scatter plots for correlations
   • Box plots for outlier detection
   • Heatmaps for correlation matrices
   • Line charts for time series

3. **Tools I can help with**
   • Python: pandas, matplotlib, seaborn, plotly
   • R: ggplot2, dplyr
   • SQL for data queries

To get started, could you share:
• The format of your data (CSV, Excel, JSON, etc.)
• What insights you're looking for
• Any specific visualizations you have in mind

Or paste a sample of your data and I can suggest the best approach!`,
    timestamp: new Date()
  }
];

const recentChats = [
  { id: '1', title: 'Dataset Analysis Help', active: true },
  { id: '2', title: 'Python Script Review' },
  { id: '3', title: 'API Integration Discussion' },
  { id: '4', title: 'Code Refactoring Tips' },
];

const capabilities = [
  {
    icon: '📊',
    title: 'Analyze Data',
    description: 'Process CSVs, perform calculations, and create charts'
  },
  {
    icon: '💻',
    title: 'Write & Debug Code',
    description: 'Python, JavaScript, SQL, and many other languages'
  },
  {
    icon: '📝',
    title: 'Draft Content',
    description: 'Essays, emails, creative writing, and more'
  },
  {
    icon: '❓',
    title: 'Answer Questions',
    description: 'Explain concepts, solve problems, brainstorm ideas'
  }
];

export default function ClaudeApp() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // Use setTimeout to prevent page scroll on mount
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 0);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I appreciate your question! Let me provide a thoughtful response based on the context you\'ve shared. What specific aspects would you like to explore further?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startNewChat = () => {
    setMessages([]);
  };

  return (
    <div className={`h-full flex ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#fafafa]'}`}>
      {/* Sidebar */}
      <div className={`w-64 flex flex-col border-r ${
        isDark ? 'bg-[#0d0d0d] border-white/10' : 'bg-white border-gray-200'
      }`}>
        {/* New Chat Button */}
        <div className="p-3">
          <button 
            onClick={startNewChat}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              isDark 
                ? 'border-white/20 hover:bg-white/5 text-white' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New chat</span>
          </button>
        </div>

        {/* Projects Dropdown */}
        <div className="px-3 pb-2">
          <button 
            onClick={() => setShowProjects(!showProjects)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
            }`}
          >
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Projects
            </span>
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </button>
        </div>

        {/* Recent Chats */}
        <div className="flex-1 overflow-auto px-2">
          {recentChats.map((chat) => (
            <button
              key={chat.id}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors mb-0.5 ${
                chat.active
                  ? isDark ? 'bg-white/10' : 'bg-gray-100'
                  : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
              }`}
            >
              <span className={`text-sm truncate ${
                chat.active 
                  ? isDark ? 'text-white' : 'text-gray-900'
                  : isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {chat.title}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className={`p-2 border-t ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
          }`}>
            <Clock className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              History
            </span>
          </button>
          <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
          }`}>
            <Star className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Starred
            </span>
          </button>
          <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
          }`}>
            <Settings className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Settings
            </span>
          </button>
          <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
          }`}>
            <HelpCircle className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Help
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-auto">
          {messages.length === 0 ? (
            // Empty state - Claude Welcome
            <div className="h-full flex flex-col items-center justify-center px-8 max-w-4xl mx-auto">
              {/* Claude Logo */}
              <div className="mb-8">
                <div className="relative w-12 h-12">
                  <Image
                    src="/provider-logos/claude/claude-icon.png"
                    alt="Claude"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <h1 className={`text-3xl font-medium mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`} style={{ fontFamily: 'Courier New, monospace' }}>
                Good afternoon
              </h1>
              <p className={`text-lg mb-12 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                How can I help you today?
              </p>

              {/* Capabilities Grid */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                {capabilities.map((cap) => (
                  <button
                    key={cap.title}
                    onClick={() => setInputValue(`Help me ${cap.title.toLowerCase()}`)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isDark 
                        ? 'border-white/10 hover:border-white/20 bg-transparent hover:bg-white/5' 
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{cap.icon}</div>
                    <div className={`font-medium mb-1 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {cap.title}
                    </div>
                    <div className={`text-sm ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {cap.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages list
            <div className="max-w-3xl mx-auto px-6 py-8">
              {messages.map((message) => (
                <div key={message.id} className="group mb-8">
                  {message.role === 'user' ? (
                    // User message
                    <div className="flex gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDark ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <span className={`text-sm font-medium ${
                          isDark ? 'text-white' : 'text-gray-700'
                        }`}>U</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`text-base leading-relaxed ${
                          isDark ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Assistant message
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#d97757]">
                        <div className="relative w-5 h-5">
                          <Image
                            src="/provider-logos/claude/claude-icon.png"
                            alt="Claude"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <div className={`prose prose-sm max-w-none ${
                          isDark ? 'prose-invert' : ''
                        }`}>
                          <p className={`text-base whitespace-pre-wrap leading-relaxed ${
                            isDark ? 'text-gray-100' : 'text-gray-800'
                          }`}>
                            {message.content}
                          </p>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mt-3">
                          <button 
                            onClick={() => handleCopy(message.content, message.id)}
                            className={`p-1.5 rounded transition-colors ${
                              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                          >
                            {copiedId === message.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            )}
                          </button>
                          <button className={`p-1.5 rounded transition-colors ${
                            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                          }`}>
                            <ThumbsUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                          </button>
                          <button className={`p-1.5 rounded transition-colors ${
                            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                          }`}>
                            <ThumbsDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-4 mb-8">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#d97757]">
                    <div className="relative w-5 h-5">
                      <Image
                        src="/provider-logos/claude/claude-icon.png"
                        alt="Claude"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isDark ? 'bg-gray-500' : 'bg-gray-400'
                    }`} />
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isDark ? 'bg-gray-500' : 'bg-gray-400'
                    }`} style={{ animationDelay: '200ms' }} />
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isDark ? 'bg-gray-500' : 'bg-gray-400'
                    }`} style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`px-6 py-4 ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#fafafa]'}`}>
          <div className="max-w-3xl mx-auto">
            {/* Model Selector */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}>
                <div className="relative w-4 h-4">
                  <Image
                    src="/provider-logos/claude/claude-icon.png"
                    alt="Claude"
                    fill
                    className="object-contain"
                  />
                </div>
                <span>Claude 3.5 Sonnet</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Input */}
            <div className={`relative rounded-2xl border ${
              isDark 
                ? 'bg-[#1a1a1a] border-white/10 focus-within:border-white/20' 
                : 'bg-white border-gray-200 focus-within:border-gray-300'
            }`}>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message Claude..."
                rows={1}
                className={`w-full bg-transparent px-4 py-3.5 pr-32 outline-none resize-none text-base ${
                  isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'
                }`}
                style={{ minHeight: '52px', maxHeight: '200px' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}>
                  <Paperclip className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                <button className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}>
                  <ImageIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`p-2 rounded-lg transition-colors ${
                    inputValue.trim()
                      ? 'bg-[#d97757] text-white'
                      : isDark ? 'bg-white/10 text-gray-500' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <p className={`text-center text-xs mt-3 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>
              Claude can make mistakes. Please double-check responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
