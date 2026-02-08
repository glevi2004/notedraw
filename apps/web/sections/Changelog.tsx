import { ChevronRight, Sparkles, Terminal, Layout, Cpu } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  icon: React.ReactNode;
}

const changelogEntries: ChangelogEntry[] = [
  {
    version: '2.4',
    date: 'Jan 22, 2026',
    title: 'Sub-agents, Skills & Image Generation',
    icon: <Sparkles className="w-4 h-4" />
  },
  {
    version: '',
    date: 'Jan 16, 2026',
    title: 'CLI Agent Mode & Cloud Handoff',
    icon: <Terminal className="w-4 h-4" />
  },
  {
    version: '',
    date: 'Jan 8, 2026',
    title: 'New CLI Features & Performance Improvements',
    icon: <Cpu className="w-4 h-4" />
  },
  {
    version: '2.3',
    date: 'Dec 22, 2025',
    title: 'Layout Customization & Stability Improvements',
    icon: <Layout className="w-4 h-4" />
  },
];

interface BlogPost {
  title: string;
  category: string;
  date: string;
  description: string;
}

const blogPosts: BlogPost[] = [
  {
    title: 'Introducing Cursor 2.0 and Composer',
    category: 'Product',
    date: 'Oct 29, 2025',
    description: 'A new interface and our first coding model, both designed specifically for working with agents.'
  },
  {
    title: 'Improving Cursor Tab with Online RL',
    category: 'Research',
    date: 'Sep 12, 2025',
    description: 'Our new Tab model achieves 28% higher acceptance while generating 21% fewer suggestions.'
  },
  {
    title: '1.5x MoE Training Speed with Custom MXFP8 Kernels',
    category: 'Research',
    date: 'Aug 29, 2025',
    description: '3.5x speedup for MoE layers through complete restructuring for Blackwell GPUs.'
  },
];

export default function Changelog() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8" id="changelog">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Changelog */}
          <div>
            <h2 className="text-2xl font-medium mb-6">Changelog</h2>
            <div className="space-y-4">
              {changelogEntries.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    {entry.version && (
                      <span className="text-lg font-semibold text-foreground">{entry.version}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{entry.date}</p>
                    <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                      {entry.title}
                    </p>
                  </div>
                  <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {entry.icon}
                  </div>
                </div>
              ))}
            </div>
            <a 
              href="#changelog" 
              className="inline-flex items-center gap-1 text-sm font-medium mt-6 hover:underline"
            >
              See what's new in Cursor
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Blog Posts */}
          <div>
            <h2 className="text-2xl font-medium mb-6">Latest Highlights</h2>
            <div className="space-y-6">
              {blogPosts.map((post, index) => (
                <a 
                  key={index}
                  href="#blog"
                  className="block p-4 rounded-xl hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>{post.category}</span>
                    <span>·</span>
                    <span>{post.date}</span>
                  </div>
                  <h3 className="text-lg font-medium mb-2 group-hover:text-foreground transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {post.description}
                  </p>
                </a>
              ))}
            </div>
            <a 
              href="#blog" 
              className="inline-flex items-center gap-1 text-sm font-medium mt-6 hover:underline"
            >
              See more articles
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Team CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-muted-foreground mb-4">
            Cursor is an applied team focused on building the future of programming.
          </p>
          <a 
            href="#careers" 
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            Join us
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
