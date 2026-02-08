'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';
import { 
  Send, 
  Plus, 
  Image as ImageIcon,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Share,
  Copy,
  Check,
  MoreHorizontal
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Help me understand neural networks',
    timestamp: new Date()
  },
  {
    id: '2',
    role: 'model',
    content: `Neural networks are computing systems inspired by the human brain. Here's a breakdown:

**Key Components:**
• **Neurons** - Basic units that receive input, process it, and pass output
• **Layers** - Input, hidden, and output layers
• **Weights & Biases** - Parameters adjusted during training
• **Activation Functions** - Decide whether a neuron fires

**How they learn:**
1. Forward propagation - data flows through the network
2. Loss calculation - measure how wrong the prediction is
3. Backpropagation - adjust weights to reduce error
4. Repeat until accurate

Would you like me to dive deeper into any specific aspect?`,
    timestamp: new Date()
  }
];

const suggestionChips = [
  'Explain transformers',
  'Write a Python function',
  'Help me debug code',
  'Creative writing tips'
];

export default function GeminiApp() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'I understand you\'re asking about "' + inputValue + '"\n\nLet me help you with that. This is a simulation of how Gemini would respond with detailed, helpful information.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, modelMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleChipClick = (text: string) => {
    setInputValue(text);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
      {/* Header - Gemini Style */}
      <header className={`flex items-center justify-between px-4 py-3 ${
        isDark ? 'bg-[#1f1f1f]' : 'bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <button className={`p-2 rounded-full hover:bg-black/5 transition-colors ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          }`}>
            <Plus className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-700'}`} />
          </button>
          <div className="flex items-center gap-2">
            {/* Gemini Logo */}
            <div className="relative w-8 h-8">
              <Image
                src="/provider-logos/gemini/icon-logo.png"
                alt="Gemini"
                fill
                className="object-contain"
              />
            </div>
            <span className={`text-xl font-normal ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ fontFamily: 'Google Sans, Roboto, sans-serif' }}>
              Gemini
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className={`p-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
          }`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </button>
          <button className={`p-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
          }`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          // Empty state with Gemini logo
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="relative w-20 h-20 mb-6">
              <Image
                src="/provider-logos/gemini/icon-logo.png"
                alt="Gemini"
                fill
                className="object-contain"
              />
            </div>
            <h1 className={`text-3xl font-normal mb-8 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`} style={{ fontFamily: 'Google Sans, Roboto, sans-serif' }}>
              Hello, there
            </h1>
            <div className="grid grid-cols-2 gap-3 max-w-2xl w-full">
              {suggestionChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    isDark 
                      ? 'border-white/10 hover:border-white/20 bg-transparent hover:bg-white/5 text-gray-300' 
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>{chip}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Messages list
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="group">
                {message.role === 'user' ? (
                  // User message - Gemini style
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDark ? 'bg-purple-600' : 'bg-purple-500'
                    }`}>
                      <span className="text-white text-sm font-medium">U</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                        style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Model message - Gemini style
                  <div className="flex items-start gap-3">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <Image
                        src="/provider-logos/gemini/icon-logo.png"
                        alt="Gemini"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1 pt-1 space-y-3">
                      <div className={`prose prose-sm max-w-none ${
                        isDark ? 'prose-invert' : ''
                      }`}>
                        <p className={`text-base whitespace-pre-wrap ${
                          isDark ? 'text-gray-200' : 'text-gray-800'
                        }`} style={{ fontFamily: 'Roboto, sans-serif' }}>
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleCopy(message.content, message.id)}
                          className={`p-2 rounded-full transition-colors ${
                            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                          }`}
                        >
                          {copiedId === message.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </button>
                        <button className={`p-2 rounded-full transition-colors ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                        }`}>
                          <ThumbsUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>
                        <button className={`p-2 rounded-full transition-colors ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                        }`}>
                          <ThumbsDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>
                        <button className={`p-2 rounded-full transition-colors ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                        }`}>
                          <Share className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>
                        <button className={`p-2 rounded-full transition-colors ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                        }`}>
                          <MoreHorizontal className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="relative w-8 h-8 flex-shrink-0">
                  <Image
                    src="/provider-logos/gemini/icon-logo.png"
                    alt="Gemini"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex items-center gap-1 pt-3">
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
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Gemini Style */}
      <div className={`px-4 py-4 ${isDark ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
        <div className="max-w-3xl mx-auto">
          <div className={`relative rounded-2xl shadow-lg ${
            isDark 
              ? 'bg-[#2d2d2d] shadow-black/20' 
              : 'bg-white shadow-gray-200'
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
              placeholder="Ask Gemini anything..."
              rows={1}
              className={`w-full bg-transparent px-4 py-4 pr-32 outline-none resize-none text-base ${
                isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'
              }`}
              style={{ minHeight: '56px', maxHeight: '200px', fontFamily: 'Roboto, sans-serif' }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button className={`p-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}>
                <ImageIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
              <button className={`p-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}>
                <Mic className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`p-2.5 rounded-full transition-colors ${
                  inputValue.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : isDark ? 'bg-white/10 text-gray-500' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className={`text-center text-xs mt-3 ${
            isDark ? 'text-gray-500' : 'text-gray-500'
          }`} style={{ fontFamily: 'Roboto, sans-serif' }}>
            Gemini can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
}
