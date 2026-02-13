"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save as SaveIcon, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyWorkspaceVisualsUpdated } from "@/lib/sidebar-sync";

interface WorkspacePayload {
  id: string;
  name: string;
  logoUrl: string | null;
  aiEnabled: boolean;
}

export default function WorkspaceSettingsPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const run = async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      if (!response.ok) return;
      const data = (await response.json()) as WorkspacePayload;
      setWorkspace(data);
      setName(data.name);
    };
    run();
  }, [workspaceId]);

  const save = async () => {
    if (!workspaceId) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to update workspace");
      }
      const updated = (await response.json()) as WorkspacePayload;
      setWorkspace(updated);
      setStatus("Workspace updated");
      notifyWorkspaceVisualsUpdated(workspaceId);
    } catch (error) {
      console.error(error);
      setStatus("Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!workspaceId) return;

    setUploadingLogo(true);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/workspaces/${workspaceId}/logo`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to upload workspace logo");
      }

      const updated = (await response.json()) as Pick<WorkspacePayload, "id" | "logoUrl">;
      setWorkspace((prev) => (prev ? { ...prev, logoUrl: updated.logoUrl } : prev));
      setStatus("Workspace logo updated");
      notifyWorkspaceVisualsUpdated(workspaceId);
    } catch (error) {
      console.error(error);
      setStatus("Failed to upload workspace logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!workspaceId) return;

    setUploadingLogo(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/logo`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to remove workspace logo");
      }
      const updated = (await response.json()) as Pick<WorkspacePayload, "id" | "logoUrl">;
      setWorkspace((prev) => (prev ? { ...prev, logoUrl: updated.logoUrl } : prev));
      setStatus("Workspace logo removed");
      notifyWorkspaceVisualsUpdated(workspaceId);
    } catch (error) {
      console.error(error);
      setStatus("Failed to remove workspace logo");
    } finally {
      setUploadingLogo(false);
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
        <h1 className="text-2xl font-semibold text-foreground">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update workspace branding and name.
        </p>
      </div>

      <section className="border-t border-border pt-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Workspace logo</label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-14 h-14 rounded-lg border border-border bg-secondary overflow-hidden flex items-center justify-center text-sm font-semibold text-foreground">
              {workspace?.logoUrl ? (
                <img
                  src={workspace.logoUrl}
                  alt="Workspace logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                (workspace?.name || "W").slice(0, 1).toUpperCase()
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                await uploadLogo(file);
                input.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              {uploadingLogo ? "Uploading..." : "Upload logo"}
            </Button>
            {workspace?.logoUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={removeLogo}
                disabled={uploadingLogo}
              >
                Remove logo
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Upload PNG/JPG/WebP image, up to 5MB.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Workspace name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving || !workspace}>
            <SaveIcon className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
          {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
        </div>
      </section>
    </div>
  );
}
