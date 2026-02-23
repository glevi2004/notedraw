'use client';

import { Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            &copy; 2026 Notedraw
          </span>

          <div className="flex items-center gap-3">
            <a
              href="#"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
