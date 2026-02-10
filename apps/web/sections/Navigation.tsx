'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';
import {
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

export default function Navigation() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Enterprise', href: '#enterprise' },
    { label: 'Pricing', href: '#pricing' },
  ];

  const resourceLinks = [
    { label: 'Changelog', href: '#changelog' },
    { label: 'Community', href: '#community' },
    { label: 'Blog', href: '#blog' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/?landing=true" className="flex items-center gap-1 group">
            <div className="w-8 h-8 relative">
              <Image
                src={theme === 'light' ? '/logo-black.png' : '/logo-white.png'}
                alt="Notedraw logo"
                fill
                sizes="38px"
                className="object-contain"
                priority
              />
            </div>
            <span className="font-semibold text-lg tracking-tight">Notedraw</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              >
                {link.label}
              </a>
            ))}
            
            {/* Resources Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary">
                  Resources
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {resourceLinks.map((link) => (
                  <DropdownMenuItem key={link.label} asChild>
                    <a href={link.href} className="cursor-pointer">
                      {link.label}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary">
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

            {/* Auth Buttons - Signed Out */}
            <SignedOut>
              <div className="hidden sm:flex items-center gap-2">
                <SignInButton mode="modal">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Log in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button 
                    size="sm" 
                    className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-4"
                  >
                    Sign up
                  </Button>
                </SignUpButton>
              </div>
            </SignedOut>

            {/* User Button - Signed In */}
            <SignedIn>
              <Link href="/dashboard">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span className="ml-1">Dashboard</span>
                </Button>
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            </SignedIn>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="px-3 py-2 text-sm font-medium text-muted-foreground">Resources</div>
              {resourceLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-6 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="px-6 py-2 border-t border-border/50 mt-2 pt-2">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary">
                      Log in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full text-left px-3 py-2 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 rounded-md mt-2">
                      Sign up
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Link href="/dashboard" className="flex-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                    <UserButton />
                  </div>
                </SignedIn>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
