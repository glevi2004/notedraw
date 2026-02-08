'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { 
  Search, 
  ChevronRight, 
  ChevronDown,
  FileText,
  Code,
  Webhook,
  BookOpen,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Menu,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

const sidebarNav: { title: string; items: NavItem[] }[] = [
  {
    title: 'Documentation',
    items: [
      { label: 'Introduction', href: '/docs', icon: <FileText className="w-4 h-4" /> },
    ]
  },
  {
    title: 'Quickstart',
    items: [
      { label: 'Node.js', href: '/docs/nodejs' },
      { label: 'Serverless', href: '/docs/serverless' },
      { label: 'PHP', href: '/docs/php' },
      { label: 'Ruby', href: '/docs/ruby' },
      { label: 'Python', href: '/docs/python' },
      { label: 'Go', href: '/docs/go' },
      { label: 'Rust', href: '/docs/rust' },
      { label: 'Elixir', href: '/docs/elixir' },
      { label: 'Java', href: '/docs/java' },
      { label: '.NET', href: '/docs/dotnet' },
      { label: 'SMTP', href: '/docs/smtp' },
    ]
  },
  {
    title: 'Learn',
    items: [
      { label: 'Sending', href: '/docs/sending' },
      { label: 'Receiving', href: '/docs/receiving' },
      { label: 'Audience', href: '/docs/audience' },
      { label: 'Domains', href: '/docs/domains' },
      { label: 'Logs', href: '/docs/logs' },
      { label: 'API Keys', href: '/docs/api-keys' },
      { label: 'Broadcasts', href: '/docs/broadcasts' },
      { label: 'Templates', href: '/docs/templates' },
      { label: 'Settings', href: '/docs/settings' },
    ]
  },
  {
    title: 'Resources',
    items: [
      { label: 'Examples', href: '/docs/examples' },
      { label: 'SDKs', href: '/docs/sdks' },
      { label: 'Security', href: '/docs/security' },
      { label: 'Integrations', href: '/docs/integrations' },
      { label: 'Storing Webhooks Data', href: '/docs/webhooks-data' },
    ]
  },
];

const topNav = [
  { label: 'Documentation', href: '/docs', icon: <FileText className="w-4 h-4" /> },
  { label: 'API Reference', href: '/docs/api-reference', icon: <Code className="w-4 h-4" /> },
  { label: 'Webhook Events', href: '/docs/webhooks', icon: <Webhook className="w-4 h-4" /> },
  { label: 'Knowledge Base', href: '/docs/knowledge-base', icon: <BookOpen className="w-4 h-4" /> },
];

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Documentation', 'Quickstart', 'Learn']);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-background" />
              </div>
              <span className="font-semibold text-lg">Cursor</span>
            </Link>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-lg border border-border hover:border-border/80 transition-colors">
                <Search className="w-4 h-4" />
                <span>Search...</span>
                <kbd className="ml-auto px-1.5 py-0.5 text-[10px] bg-background rounded border">Ctrl K</kbd>
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Sparkles className="w-4 h-4" />
                Ask AI
              </button>

              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted">
                    {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setTheme('light')} className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Light
                    {theme === 'light' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')} className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Dark
                    {theme === 'dark' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    setTheme(prefersDark ? 'dark' : 'light');
                  }} className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link 
                href="/login" 
                className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>

              <Link 
                href="/download"
                className="px-4 py-1.5 text-sm font-medium bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors"
              >
                Get Started
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Nav */}
        <div className="border-t border-border hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1 -mb-px">
              {topNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive(item.href) || (item.href === '/docs' && pathname.startsWith('/docs'))
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 py-8">
          {/* Sidebar */}
          <aside className={`
            fixed lg:sticky lg:top-[7rem] z-40
            w-64 h-[calc(100vh-7rem)] overflow-y-auto
            bg-background lg:bg-transparent
            border-r lg:border-r-0 border-border
            ${mobileMenuOpen ? 'left-0 top-[7rem]' : '-left-64 lg:left-0'}
            transition-all duration-200
          `}>
            <nav className="space-y-6 pr-4">
              {sidebarNav.map((section) => (
                <div key={section.title}>
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center gap-1 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    {expandedSections.includes(section.title) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    {section.title}
                  </button>
                  
                  {expandedSections.includes(section.title) && (
                    <ul className="space-y-0.5 ml-2">
                      {section.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                              isActive(item.href)
                                ? 'bg-muted text-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            {item.icon}
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </nav>
          </aside>

          {/* Overlay for mobile */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 lg:ml-0">
            {children}
          </main>

          {/* Right Sidebar - On This Page */}
          <aside className="hidden xl:block w-48 sticky top-[7rem] h-fit">
            <div className="text-sm">
              <h4 className="font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span className="text-xs">☰</span>
                On this page
              </h4>
              <nav className="space-y-1 border-l border-border pl-3">
                <a href="#quickstart" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Quickstart
                </a>
                <a href="#explore" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Explore
                </a>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
