"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

type PreferenceTheme = "SYSTEM" | "LIGHT" | "DARK";

export default function PreferencesSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [preferenceTheme, setPreferenceTheme] = useState<PreferenceTheme>("SYSTEM");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: preferenceTheme }),
      });
      if (!response.ok) throw new Error("Failed");
      setStatus("Preferences saved");
    } catch {
      setStatus("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your app-level defaults and theme behavior.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="text-xs text-muted-foreground mt-1">
            Current runtime theme: {theme}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1.5 rounded border text-sm ${preferenceTheme === "SYSTEM" ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
            onClick={() => setPreferenceTheme("SYSTEM")}
          >
            System
          </button>
          <button
            className={`px-3 py-1.5 rounded border text-sm ${preferenceTheme === "LIGHT" ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
            onClick={() => setPreferenceTheme("LIGHT")}
          >
            Light
          </button>
          <button
            className={`px-3 py-1.5 rounded border text-sm ${preferenceTheme === "DARK" ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
            onClick={() => setPreferenceTheme("DARK")}
          >
            Dark
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save preferences"}
          </Button>
          {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
        </div>
      </section>
    </div>
  );
}
