"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function WorkspaceAIPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    const run = async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      if (!response.ok) return;
      const data = (await response.json()) as { aiEnabled: boolean };
      setAiEnabled(data.aiEnabled);
    };
    run();
  }, [workspaceId]);

  const save = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a workspace from the dashboard sidebar first.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">AI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control AI capabilities for this workspace.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Enable AI features</p>
            <p className="text-xs text-muted-foreground mt-1">
              Disable this to block AI generation and chat features for all members.
            </p>
          </div>
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(event) => setAiEnabled(event.target.checked)}
            className="h-4 w-4"
          />
        </label>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </section>
    </div>
  );
}
