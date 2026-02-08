'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';
import { 
  MessageSquare, 
  Send, 
  Plus,
  Search,
  FolderOpen,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Image as ImageIcon,
  Paperclip,
  PanelLeftClose,
  PanelLeft
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
    content: 'What are the key features of React 19?',
    timestamp: new Date()
  },
  {
    id: '2',
    role: 'assistant',
    content: `React 19 introduces several exciting features that improve performance and developer experience:

**Server Components & Actions**
• React Server Components are now stable
• Server Actions allow mutations without API endpoints
• Automatic code splitting for server components

**New Hooks**
• use() - A new hook for reading resources (promises, context)
• useFormStatus() - Track form submission state
• useFormState() - Handle form state updates

**Improved Asset Loading**
• Native support for preloading resources
• Better integration with Suspense for stylesheets, fonts, and scripts

**Actions**
• Functions that can be called from client to server
• Automatic optimistic updates
• Built-in pending states

**Other Improvements**
• Better hydration error reporting
• Ref as a prop (no more forwardRef in most cases)
• Improved TypeScript support

Would you like me to show you examples of any of these features?`,
    timestamp: new Date()
  }
];

const chatHistory = [
  { id: '1', title: 'React 19 Features Discussion', active: true },
  { id: '2', title: 'Python Data Analysis Help' },
  { id: '3', title: 'CSS Grid vs Flexbox' },
  { id: '4', title: 'Machine Learning Basics' },
  { id: '5', title: 'TypeScript Generics Explained' },
];

const suggestionPrompts = [
  'Create a workout plan',
  'Explain quantum computing',
  'Write a poem about space',
  'Help me debug this code',
  'Suggest dinner recipes',
  'Plan a weekend trip'
];

export default function ChatGPTApp() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
        content: 'That\'s a great question! I\'d be happy to help you explore that topic further. What specific aspects would you like to know more about?',
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
    <div className={`h-full flex ${isDark ? 'bg-[#212121]' : 'bg-white'}`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div className={`w-64 flex flex-col ${
          isDark ? 'bg-[#171717]' : 'bg-gray-50'
        }`}>
          {/* New Chat Button */}
          <div className="p-3">
            <button 
              onClick={startNewChat}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                isDark 
                  ? 'border-white/20 hover:bg-white/5 text-white' 
                  : 'border-gray-300 hover:bg-gray-100 text-gray-800'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">New chat</span>
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
              isDark ? 'bg-white/5' : 'bg-white border border-gray-200'
            }`}>
              <Search className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent text-sm outline-none ${
                  isDark ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-auto px-2 py-2">
            <div className={`text-xs font-medium px-2 py-2 ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Today
            </div>
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  chat.active
                    ? isDark ? 'bg-[#212121]' : 'bg-white shadow-sm'
                    : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                }`}
              >
                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                  chat.active 
                    ? isDark ? 'text-white' : 'text-gray-800'
                    : isDark ? 'text-gray-500' : 'text-gray-500'
                }`} />
                <span className={`text-sm truncate ${
                  chat.active 
                    ? isDark ? 'text-white' : 'text-gray-900'
                    : isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {chat.title}
                </span>
              </button>
            ))}

            <div className={`text-xs font-medium px-2 py-2 mt-2 ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Previous 7 Days
            </div>
            {chatHistory.slice(0, 3).map((chat) => (
              <button
                key={`prev-${chat.id}`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                }`}
              >
                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                  isDark ? 'text-gray-500' : 'text-gray-500'
                }`} />
                <span className={`text-sm truncate ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {chat.title}
                </span>
              </button>
            ))}
          </div>

          {/* User Profile */}
          <div className={`p-3 border-t ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}>
            <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
            }`}>
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-medium">
                U
              </div>
              <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                User
              </span>
              <MoreHorizontal className={`w-4 h-4 ml-auto ${
                isDark ? 'text-gray-500' : 'text-gray-500'
              }`} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`flex items-center justify-between px-4 py-3 ${
          isDark ? 'bg-[#212121]' : 'bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}
            >
              {sidebarOpen ? (
                <PanelLeftClose className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              ) : (
                <PanelLeft className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              )}
            </button>
            {/* ChatGPT Logo/Title */}
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6">
                <Image
                  src={isDark ? "/provider-logos/openai/OpenAI-white-monoblossom.svg" : "/provider-logos/openai/OpenAI-black-monoblossom.svg"}
                  alt="ChatGPT"
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ChatGPT
              </h1>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'
            }`}>
              4o
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            }`}>
              <FolderOpen className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
            <button className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            }`}>
              <MoreHorizontal className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-auto">
          {messages.length === 0 ? (
            // Empty state
            <div className="h-full flex flex-col items-center justify-center px-4">
              <h2 className={`text-2xl font-semibold mb-8 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                What can I help with?
              </h2>
              <div className="grid grid-cols-2 gap-2 max-w-xl w-full">
                {suggestionPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInputValue(prompt)}
                    className={`text-left p-3 rounded-xl border text-sm transition-colors ${
                      isDark 
                        ? 'border-white/10 hover:border-white/20 bg-transparent hover:bg-white/5 text-gray-300' 
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages list
            <div className="max-w-3xl mx-auto">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`px-4 py-6 ${
                    isDark ? 'bg-[#212121]' : 'bg-white'
                  }`}
                >
                  <div className="flex gap-4">
                    {message.role === 'assistant' ? (
                      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                        <div className="relative w-5 h-5">
                          <Image
                            src="/provider-logos/openai/OpenAI-white-monoblossom.svg"
                            alt="ChatGPT"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-medium">
                        U
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`prose prose-sm max-w-none ${
                        isDark ? 'prose-invert' : ''
                      }`}>
                        <p className={`text-base whitespace-pre-wrap leading-relaxed ${
                          isDark ? 'text-gray-100' : 'text-gray-800'
                        }`}>
                          {message.content}
                        </p>
                      </div>
                      
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-1 mt-3">
                          <button 
                            onClick={() => handleCopy(message.content, message.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                          >
                            {copiedId === message.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            )}
                          </button>
                          <button className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                          }`}>
                            <ThumbsUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                          </button>
                          <button className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                          }`}>
                            <ThumbsDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className={`px-4 py-6 ${isDark ? 'bg-[#212121]' : 'bg-white'}`}>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                      <div className="relative w-5 h-5">
                        <Image
                          src="/provider-logos/openai/OpenAI-white-monoblossom.svg"
                          alt="ChatGPT"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pt-2">
                      <div className={`w-2 h-2 rounded-full animate-bounce ${
                        isDark ? 'bg-gray-500' : 'bg-gray-400'
                      }`} style={{ animationDelay: '0ms' }} />
                      <div className={`w-2 h-2 rounded-full animate-bounce ${
                        isDark ? 'bg-gray-500' : 'bg-gray-400'
                      }`} style={{ animationDelay: '150ms' }} />
                      <div className={`w-2 h-2 rounded-full animate-bounce ${
                        isDark ? 'bg-gray-500' : 'bg-gray-400'
                      }`} style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`px-4 py-4 ${isDark ? 'bg-[#212121]' : 'bg-white'}`}>
          <div className="max-w-3xl mx-auto">
            <div className={`relative rounded-3xl border ${
              isDark 
                ? 'bg-[#2f2f2f] border-transparent shadow-lg shadow-black/20' 
                : 'bg-gray-100 border-transparent'
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
                placeholder="Message ChatGPT..."
                rows={1}
                className={`w-full bg-transparent px-4 py-3.5 pr-36 outline-none resize-none text-base ${
                  isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'
                }`}
                style={{ minHeight: '52px', maxHeight: '200px' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                }`}>
                  <Paperclip className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                <button className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                }`}>
                  <ImageIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`p-2 rounded-lg transition-colors ${
                    inputValue.trim()
                      ? 'bg-white text-black'
                      : isDark ? 'bg-white/20 text-gray-500' : 'bg-gray-300 text-gray-400'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className={`text-center text-xs mt-2 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>
              ChatGPT can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
