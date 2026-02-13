"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ExportJob {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  scope: string;
  createdAt: string;
}

export default function WorkspaceExportPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [jobs, setJobs] = useState<ExportJob[]>([]);

  const load = async () => {
    if (!workspaceId) return;
    const response = await fetch(`/api/workspaces/${workspaceId}/export`);
    if (!response.ok) return;
    setJobs((await response.json()) as ExportJob[]);
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const trigger = async () => {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "workspace" }),
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
        <h1 className="text-2xl font-semibold text-foreground">Workspace Export</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trigger a workspace export job and track status.
        </p>
      </div>

      <section className="border-t border-border pt-6 space-y-3">
        <Button onClick={trigger}>Export workspace to ZIP</Button>
        <p className="text-xs text-muted-foreground">
          Export job queue is implemented; archive generation will be wired next.
        </p>
      </section>

      <section className="border-t border-border pt-6 space-y-3">
        <h2 className="text-lg font-medium text-foreground">Export history</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exports yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="border border-border rounded-md px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-foreground">{job.scope}</p>
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
