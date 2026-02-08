'use client';

import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Monitor, Shield, ExternalLink, Github, Twitter, Linkedin, Youtube } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Footer() {
  const { theme, setTheme } = useTheme();

  const footerLinks = {
    product: {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Enterprise', href: '#enterprise' },
        { label: 'Web Agents', href: '#agents' },
        { label: 'Bugbot', href: '#bugbot' },
        { label: 'CLI', href: '#cli' },
        { label: 'Pricing', href: '#pricing' },
      ]
    },
    resources: {
      title: 'Resources',
      links: [
        { label: 'Download', href: '#download' },
        { label: 'Changelog', href: '#changelog' },
        { label: 'Documentation', href: '#docs', external: true },
        { label: 'Learn', href: '#learn', external: true },
        { label: 'Forum', href: '#forum', external: true },
        { label: 'Status', href: '#status', external: true },
      ]
    },
    company: {
      title: 'Company',
      links: [
        { label: 'Careers', href: '#careers' },
        { label: 'Blog', href: '#blog' },
        { label: 'Community', href: '#community' },
        { label: 'Workshops', href: '#workshops' },
        { label: 'Students', href: '#students' },
        { label: 'Brand', href: '#brand' },
      ]
    },
    legal: {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', href: '#terms' },
        { label: 'Privacy Policy', href: '#privacy' },
        { label: 'Data Usage', href: '#data-use' },
        { label: 'Security', href: '#security' },
      ]
    },
    connect: {
      title: 'Connect',
      links: [
        { label: 'X', href: 'https://x.com/cursor_ai', external: true },
        { label: 'LinkedIn', href: 'https://linkedin.com/company/cursorai', external: true },
        { label: 'YouTube', href: 'https://youtube.com/@cursor_ai', external: true },
      ]
    }
  };

  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Product */}
          <div>
            <h3 className="font-medium text-sm mb-4">{footerLinks.product.title}</h3>
            <ul className="space-y-2">
              {footerLinks.product.links.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-medium text-sm mb-4">{footerLinks.resources.title}</h3>
            <ul className="space-y-2">
              {footerLinks.resources.links.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    {link.external && <ExternalLink className="w-3 h-3" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-medium text-sm mb-4">{footerLinks.company.title}</h3>
            <ul className="space-y-2">
              {footerLinks.company.links.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-medium text-sm mb-4">{footerLinks.legal.title}</h3>
            <ul className="space-y-2">
              {footerLinks.legal.links.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-medium text-sm mb-4">{footerLinks.connect.title}</h3>
            <ul className="space-y-2">
              {footerLinks.connect.links.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Theme Toggle */}
          <div>
            <h3 className="font-medium text-sm mb-4">Theme</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md border border-border hover:bg-secondary">
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'light' ? 'Light' : 'Dark'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
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
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              © 2026 Cursor
            </span>
            <a 
              href="#security"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-4 h-4" />
              SOC 2 Certified
            </a>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-3">
            <a 
              href="https://x.com/cursor_ai"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              aria-label="X (Twitter)"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a 
              href="https://linkedin.com/company/cursorai"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a 
              href="https://youtube.com/@cursor_ai"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              aria-label="YouTube"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a 
              href="https://github.com"
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
