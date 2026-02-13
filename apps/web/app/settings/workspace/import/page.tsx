"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImportJob {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  sourceName: string | null;
  createdAt: string;
}

export default function WorkspaceImportPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [sourceName, setSourceName] = useState("scenes.zip");
  const [jobs, setJobs] = useState<ImportJob[]>([]);

  const load = async () => {
    if (!workspaceId) return;
    const response = await fetch(`/api/workspaces/${workspaceId}/import`);
    if (!response.ok) return;
    setJobs((await response.json()) as ImportJob[]);
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const trigger = async () => {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceName }),
    });
    await load();
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
        <h1 className="text-2xl font-semibold text-foreground">Workspace Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Queue import jobs for ZIP archives or collection payloads.
        </p>
      </div>

      <section className="border-t border-border pt-6 space-y-3">
        <div className="max-w-sm space-y-2">
          <label className="text-sm font-medium text-foreground">Source name</label>
          <Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
        </div>
        <Button onClick={trigger}>Queue import</Button>
      </section>

      <section className="border-t border-border pt-6 space-y-3">
        <h2 className="text-lg font-medium text-foreground">Import history</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No imports yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="border border-border rounded-md px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-foreground">{job.sourceName || "Unnamed source"}</p>
                  <p className="text-xs text-muted-foreground">{job.id}</p>
                </div>
                <span className="text-xs text-muted-foreground">{job.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
