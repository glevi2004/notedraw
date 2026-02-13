"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type InviteState = "loading" | "success" | "error";

export default function AcceptWorkspaceInvitePage() {
  const params = useParams<{ token?: string | string[] }>();
  const router = useRouter();
  const [state, setState] = useState<InviteState>("loading");
  const [message, setMessage] = useState("Joining workspace...");

  const token = useMemo(() => {
    const raw = params?.token;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Invitation token is missing.");
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch(`/api/workspace-invitations/${token}/accept`, {
          method: "POST",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error || "Could not accept invitation");
        }

        const payload = (await response.json()) as { workspaceId?: string };
        if (!payload.workspaceId) {
          throw new Error("Workspace not found in invitation response");
        }

        if (cancelled) return;
        setState("success");
        setMessage("Workspace joined. Redirecting...");
        router.replace(`/dashboard?workspaceId=${payload.workspaceId}`);
      } catch (error) {
        if (cancelled) return;
        const errorMessage = error instanceof Error ? error.message : "Could not accept invitation";
        setState("error");
        setMessage(errorMessage);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Workspace invitation</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {state === "error" ? (
          <div className="flex gap-2">
            <Button type="button" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/dashboard")}>
              Go to dashboard
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
