"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WorkspaceResponse {
  id: string;
}

export function OnboardingWorkspaceForm({
  initialWorkspaceName,
}: {
  initialWorkspaceName: string;
}) {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) {
      setError("Workspace name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to create workspace");
      }

      const createdWorkspace = (await response.json()) as WorkspaceResponse;
      router.replace(`/dashboard?workspaceId=${createdWorkspace.id}`);
    } catch (submitError) {
      console.error(submitError);
      setError("Unable to create workspace. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10 md:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/20 p-2 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Name your workspace
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                This is your main workspace name. You can create additional
                workspaces anytime from the sidebar.
              </p>
            </div>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="workspace-name">
                Workspace name
              </label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Acme Design Team"
                autoFocus
                maxLength={80}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSubmitting || !workspaceName.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating workspace...
                  </>
                ) : (
                  "Create workspace"
                )}
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
