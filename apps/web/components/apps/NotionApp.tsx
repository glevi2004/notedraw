'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';
import { 
  Search,
  Settings,
  Plus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Clock,
  Trash2,
  Star,
  Share2,
  MessageSquare,
  Calendar,
  Inbox,
  ChevronLeft,
  GripVertical,
  Type,
  Heading1,
  List,
  CheckSquare,
  Image as ImageIcon,
  Code,
  Table,
  Quote
} from 'lucide-react';

interface Page {
  id: string;
  title: string;
  icon?: string;
  children?: Page[];
  isExpanded?: boolean;
}

const workspacePages: Page[] = [
  {
    id: '1',
    title: 'Getting Started',
    icon: '🚀',
    isExpanded: true,
    children: [
      { id: '1-1', title: 'Quick Note', icon: '📝' },
      { id: '1-2', title: 'Project Ideas', icon: '💡' }
    ]
  },
  {
    id: '2',
    title: 'Team Wiki',
    icon: '📚',
    isExpanded: false,
    children: [
      { id: '2-1', title: 'Engineering', icon: '⚙️' },
      { id: '2-2', title: 'Design', icon: '🎨' }
    ]
  },
  { id: '3', title: 'Meeting Notes', icon: '🗓️' },
  { id: '4', title: 'Tasks & Projects', icon: '✅' },
  { id: '5', title: 'Knowledge Base', icon: '🧠' }
];

const sampleBlocks = [
  { type: 'heading1', content: 'Welcome to Your Workspace' },
  { type: 'text', content: 'This is a sample Notion page. You can create, edit, and organize all your content here.' },
  { type: 'heading2', content: 'Getting Started' },
  { type: 'bullet', content: 'Create pages and sub-pages' },
  { type: 'bullet', content: 'Add different types of content blocks' },
  { type: 'bullet', content: 'Collaborate with your team in real-time' },
  { type: 'heading2', content: 'Key Features' },
  { type: 'todo', content: 'Set up your team workspace', checked: true },
  { type: 'todo', content: 'Import existing documents', checked: false },
  { type: 'todo', content: 'Invite team members', checked: false },
  { type: 'quote', content: 'Notion is the all-in-one workspace for your notes, tasks, wikis, and databases.' }
];

export default function NotionApp() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [pages, setPages] = useState<Page[]>(workspacePages);
  const [activePage, setActivePage] = useState('1');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);

  const togglePage = (pageId: string) => {
    setPages(prev => prev.map(page => {
      if (page.id === pageId) {
        return { ...page, isExpanded: !page.isExpanded };
      }
      return page;
    }));
  };

  const renderPageTree = (pageList: Page[], depth = 0) => {
    return pageList.map(page => (
      <div key={page.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors ${
            activePage === page.id
              ? isDark ? 'bg-white/10' : 'bg-gray-100'
              : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => setActivePage(page.id)}
        >
          {page.children ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePage(page.id);
              }}
              className={`p-0.5 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
            >
              {page.isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className="text-base">{page.icon || '📄'}</span>
          <span className={`text-sm truncate flex-1 ${
            activePage === page.id
              ? isDark ? 'text-white' : 'text-gray-900'
              : isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {page.title}
          </span>
        </div>
        {page.children && page.isExpanded && renderPageTree(page.children, depth + 1)}
      </div>
    ));
  };

  const renderBlock = (block: any, index: number) => {
    const isHovered = hoveredBlock === `${block.type}-${index}`;
    
    const blockContent = () => {
      switch (block.type) {
        case 'heading1':
          return (
            <h1 className={`text-4xl font-bold mt-6 mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {block.content}
            </h1>
          );
        case 'heading2':
          return (
            <h2 className={`text-2xl font-semibold mt-5 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {block.content}
            </h2>
          );
        case 'text':
          return (
            <p className={`text-base leading-relaxed mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {block.content}
            </p>
          );
        case 'bullet':
          return (
            <div className="flex items-start gap-2 mb-1">
              <span className={`mt-2 w-1.5 h-1.5 rounded-full ${isDark ? 'bg-gray-500' : 'bg-gray-400'}`} />
              <span className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {block.content}
              </span>
            </div>
          );
        case 'todo':
          return (
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                block.checked
                  ? 'bg-blue-500 border-blue-500'
                  : isDark ? 'border-gray-600' : 'border-gray-300'
              }`}>
                {block.checked && <CheckSquare className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-base ${
                block.checked
                  ? isDark ? 'text-gray-500 line-through' : 'text-gray-400 line-through'
                  : isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {block.content}
              </span>
            </div>
          );
        case 'quote':
          return (
            <blockquote className={`border-l-4 pl-4 py-1 my-3 italic ${
              isDark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'
            }`}>
              {block.content}
            </blockquote>
          );
        default:
          return null;
      }
    };

    return (
      <div
        key={`${block.type}-${index}`}
        className="relative group"
        onMouseEnter={() => setHoveredBlock(`${block.type}-${index}`)}
        onMouseLeave={() => setHoveredBlock(null)}
      >
        {/* Block handle */}
        <div className={`absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
          isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
        }`}>
          <GripVertical className="w-4 h-4" />
        <Plus className="w-3 h-3 absolute -right-1 -bottom-1" />
        </div>
        {blockContent()}
      </div>
    );
  };

  return (
    <div className={`h-full flex ${isDark ? 'bg-[#191919]' : 'bg-white'}`}>
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <div className={`w-64 flex flex-col border-r ${
          isDark ? 'bg-[#202020] border-gray-800' : 'bg-gray-50 border-gray-200'
        }`}>
          {/* Workspace Header */}
          <div className={`flex items-center justify-between px-3 py-2 border-b ${
            isDark ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-black">
                <span className="text-white text-xs font-bold">N</span>
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                My Workspace
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setSidebarCollapsed(true)}
                className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Search & Notifications */}
          <div className="px-2 py-2 space-y-1">
            <button className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}>
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">Search</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
              }`}>⌘P</span>
            </button>
            <button className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}>
              <Clock className="w-4 h-4" />
              <span>Updates</span>
              <span className="w-2 h-2 rounded-full bg-red-500 ml-auto" />
            </button>
            <button className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}>
              <Settings className="w-4 h-4" />
              <span>Settings & members</span>
            </button>
          </div>

          {/* Private Section */}
          <div className="flex-1 overflow-auto px-2">
            <div className={`flex items-center justify-between px-2 py-1 mb-1 ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
              <span className="text-xs font-medium uppercase tracking-wide">Private</span>
              <button className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {renderPageTree(pages)}
          </div>

          {/* Favorites */}
          <div className={`border-t px-2 py-2 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <button className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}>
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
            </button>
            <button className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}>
              <Star className="w-4 h-4" />
              <span>Favorites</span>
            </button>
            <button className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}>
              <Trash2 className="w-4 h-4" />
              <span>Trash</span>
            </button>
          </div>
        </div>
      )}

      {/* Collapsed Sidebar Toggle */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className={`absolute left-4 top-4 z-10 p-2 rounded-lg shadow-lg ${
            isDark ? 'bg-[#202020] hover:bg-[#2a2a2a]' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <GripVertical className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
        </button>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-24 py-12">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-start gap-2 mb-4">
              <span className="text-6xl">🚀</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>Workspace</span>
              <ChevronRight className="w-3 h-3" />
              <span>Getting Started</span>
            </div>
            <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Getting Started
            </h1>
            
            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}>
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}>
                <MessageSquare className="w-4 h-4" />
                Comments
              </button>
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}>
                <Star className="w-4 h-4" />
                Favorite
              </button>
              <button className={`p-1.5 rounded transition-colors ${
                isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="space-y-1">
            {sampleBlocks.map((block, index) => renderBlock(block, index))}
          </div>

          {/* Add Block Hint */}
          <div className={`mt-8 flex items-center gap-2 text-sm ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <button className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
              <Plus className="w-4 h-4" />
            </button>
            <span>Click to add a block, or type '/' for commands</span>
          </div>
        </div>
      </div>
    </div>
  );
}
