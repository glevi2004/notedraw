"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

type PreferenceTheme = "SYSTEM" | "LIGHT" | "DARK";

export default function PreferencesSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [preferenceTheme, setPreferenceTheme] = useState<PreferenceTheme>("SYSTEM");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      const response = await fetch("/api/account/preferences");
      if (!response.ok) return;
      const data = (await response.json()) as { theme: PreferenceTheme };
      setPreferenceTheme(data.theme);
    };
    run();
  }, []);

  useEffect(() => {
    if (preferenceTheme === "LIGHT") setTheme("light");
    if (preferenceTheme === "DARK") setTheme("dark");
    if (preferenceTheme === "SYSTEM") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, [preferenceTheme, setTheme]);

  const save = async (newTheme: PreferenceTheme) => {
    setSaving(true);
    try {
      const response = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });
      if (!response.ok) throw new Error("Failed");
      setPreferenceTheme(newTheme);
    } catch {
      // Silently fail - theme will still update locally
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: PreferenceTheme) => {
    setPreferenceTheme(newTheme);
    save(newTheme);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your app-level defaults and theme behavior.
        </p>
      </div>

      <section className="border-t border-border pt-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="text-xs text-muted-foreground mt-1">
            Current runtime theme: {theme}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm transition-colors ${
              preferenceTheme === "SYSTEM"
                ? "border-primary text-foreground bg-primary/10"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
            onClick={() => handleThemeChange("SYSTEM")}
            disabled={saving}
          >
            <Monitor className="w-4 h-4" />
            System
          </button>
          <button
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm transition-colors ${
              preferenceTheme === "LIGHT"
                ? "border-primary text-foreground bg-primary/10"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
            onClick={() => handleThemeChange("LIGHT")}
            disabled={saving}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm transition-colors ${
              preferenceTheme === "DARK"
                ? "border-primary text-foreground bg-primary/10"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
            onClick={() => handleThemeChange("DARK")}
            disabled={saving}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </div>
      </section>
    </div>
  );
}
