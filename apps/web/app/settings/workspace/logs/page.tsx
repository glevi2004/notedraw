"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

interface WorkspaceLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actorUser: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

export default function WorkspaceLogsPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [actionFilter, setActionFilter] = useState("");
  const [logs, setLogs] = useState<WorkspaceLog[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    const run = async () => {
      const params = new URLSearchParams();
      if (actionFilter.trim()) {
        params.set("action", actionFilter.trim());
      }
      const response = await fetch(
        `/api/workspaces/${workspaceId}/logs?${params.toString()}`,
      );
      if (!response.ok) return;
      setLogs((await response.json()) as WorkspaceLog[]);
    };

    run();
  }, [workspaceId, actionFilter]);

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
        <h1 className="text-2xl font-semibold text-foreground">Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Activity stream for workspace actions and events.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="max-w-sm space-y-2">
          <label className="text-sm font-medium text-foreground">Filter by action</label>
          <Input
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            placeholder="workspace.invite.create"
          />
        </div>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No log entries.</p>
          ) : (
            logs.map((log) => {
              const actorName = log.actorUser
                ? `${log.actorUser.firstName || ""} ${log.actorUser.lastName || ""}`.trim() ||
                  log.actorUser.email ||
                  "Unknown"
                : "System";

              return (
                <div
                  key={log.id}
                  className="border border-border rounded-md px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {actorName} · {log.entityType}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
