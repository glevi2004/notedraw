import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarDataProvider } from "@/context/SidebarDataContext";

export const metadata: Metadata = {
  title: "Notedraw - Unified Drawing and Notes Workspace",
  description:
    "A unified workspace combining Excalidraw-style drawing capabilities with Notion-like notes functionality.",
};

// Script to prevent flash of incorrect theme (FOUC)
// This runs before React hydrates and sets the theme class immediately
const themeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('notedraw-theme');
      if (theme === 'dark' || theme === 'light') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        }
      }
    } catch (e) {
      // Fallback to dark mode if localStorage is not available
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          <script
            dangerouslySetInnerHTML={{
              __html: 'window.EXCALIDRAW_ASSET_PATH = "/";',
            }}
          />
        </head>
        <body>
          <ThemeProvider>
            <SidebarDataProvider>{children}</SidebarDataProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
