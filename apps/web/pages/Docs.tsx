'use client';

import Link from 'next/link';
import { 
  Copy, 
  Check,
  Globe,
  Webhook,
  Mail,
  Users
} from 'lucide-react';
import { useState } from 'react';

interface QuickstartCard {
  title: string;
  href: string;
  icon: React.ReactNode;
}

interface ExploreCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const quickstartCards: QuickstartCard[] = [
  { title: 'Node.js Quickstart', href: '/docs/nodejs', icon: <span className="text-lg">🟢</span> },
  { title: 'Next.js Quickstart', href: '/docs/nextjs', icon: <span className="text-lg">▲</span> },
  { title: 'Express Quickstart', href: '/docs/express', icon: <span className="text-lg">🚂</span> },
  { title: 'PHP Quickstart', href: '/docs/php', icon: <span className="text-lg">🐘</span> },
  { title: 'Laravel Quickstart', href: '/docs/laravel', icon: <span className="text-lg">🚀</span> },
  { title: 'Python Quickstart', href: '/docs/python', icon: <span className="text-lg">🐍</span> },
  { title: 'Ruby Quickstart', href: '/docs/ruby', icon: <span className="text-lg">💎</span> },
  { title: 'Rails Quickstart', href: '/docs/rails', icon: <span className="text-lg">🛤️</span> },
  { title: 'Go Quickstart', href: '/docs/go', icon: <span className="text-lg">🐹</span> },
  { title: 'Rust Quickstart', href: '/docs/rust', icon: <span className="text-lg">🦀</span> },
  { title: 'Elixir Quickstart', href: '/docs/elixir', icon: <span className="text-lg">💧</span> },
  { title: 'Java Quickstart', href: '/docs/java', icon: <span className="text-lg">☕</span> },
];

const exploreCards: ExploreCard[] = [
  {
    title: 'Emails',
    description: 'Visualize all the activity in your account.',
    href: '/docs/emails',
    icon: <Mail className="w-5 h-5" />
  },
  {
    title: 'Domains',
    description: 'Ensure deliverability of your emails.',
    href: '/docs/domains',
    icon: <Globe className="w-5 h-5" />
  },
  {
    title: 'Webhooks',
    description: 'Notify your application about email events.',
    href: '/docs/webhooks',
    icon: <Webhook className="w-5 h-5" />
  },
  {
    title: 'Audience',
    description: 'Manage your contacts and segments.',
    href: '/docs/audience',
    icon: <Users className="w-5 h-5" />
  },
];

export default function Docs() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText('Cursor is the AI code editor for developers.');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <span>Documentation</span>
        <ChevronRight className="w-4 h-4" />
      </nav>

      {/* Title */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-4xl font-bold tracking-tight">Introduction</h1>
        <button 
          onClick={copyToClipboard}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          title="Copy page link"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Description */}
      <p className="text-lg text-muted-foreground mb-12">
        Cursor is the AI code editor for developers.
      </p>

      {/* Quickstart Section */}
      <section id="quickstart" className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">Quickstart</h2>
        <p className="text-muted-foreground mb-6">
          Learn how to get Cursor set up in your project.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {quickstartCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-border/80 hover:bg-muted/50 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {card.icon}
              </div>
              <span className="font-medium group-hover:text-foreground transition-colors">
                {card.title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Explore Section */}
      <section id="explore" className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">Explore</h2>
        <p className="text-muted-foreground mb-6">
          Discover the full range of features and capabilities.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {exploreCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group p-4 rounded-lg border border-border bg-card hover:border-border/80 hover:bg-muted/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.icon}
                </div>
                <span className="font-medium group-hover:text-foreground transition-colors">
                  {card.title}
                </span>
              </div>
              <p className="text-sm text-muted-foreground ml-11">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Helpful Section */}
      <div className="border-t border-border pt-8 mt-12">
        <p className="text-sm text-muted-foreground mb-4">Was this page helpful?</p>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">
            Yes
          </button>
          <button className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">
            No
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
