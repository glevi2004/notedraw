"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";

export default function WorkspaceAIPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const run = async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      if (!response.ok) return;
      const data = (await response.json()) as { aiEnabled: boolean };
      setAiEnabled(data.aiEnabled);
      setStatus(null);
    };
    run();
  }, [workspaceId]);

  const updateAiEnabled = async (nextEnabled: boolean) => {
    if (!workspaceId) return;

    const previousValue = aiEnabled;
    setAiEnabled(nextEnabled);
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: nextEnabled }),
      });
      if (!response.ok) {
        throw new Error("Failed to update AI setting");
      }
      const updated = (await response.json()) as { aiEnabled: boolean };
      setAiEnabled(updated.aiEnabled);
      setStatus(updated.aiEnabled ? "AI enabled" : "AI disabled");
    } catch (error) {
      console.error("Error updating AI setting:", error);
      setAiEnabled(previousValue);
      setStatus("Failed to update AI setting");
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

      <section className="border-t border-border pt-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Enable AI features</p>
            <p className="text-xs text-muted-foreground mt-1">
              Disable this to block AI generation and chat features for all members.
            </p>
          </div>
          <Switch
            checked={aiEnabled}
            onCheckedChange={(checked) => {
              if (checked === aiEnabled || saving) return;
              void updateAiEnabled(checked);
            }}
            disabled={saving}
            aria-label="Toggle workspace AI features"
          />
        </div>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </section>
    </div>
  );
}
