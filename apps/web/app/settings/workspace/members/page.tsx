"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WorkspaceMemberItem {
  id: string;
  role: "VIEWER" | "MEMBER" | "ADMIN";
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

interface WorkspaceInvitationItem {
  id: string;
  email: string;
  role: "VIEWER" | "MEMBER" | "ADMIN";
  createdAt: string;
  expiresAt: string | null;
}

interface WorkspaceSummary {
  id: string;
  role?: "VIEWER" | "MEMBER" | "ADMIN" | null;
}

export default function WorkspaceMembersPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [members, setMembers] = useState<WorkspaceMemberItem[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitationItem[]>([]);
  const [activeRole, setActiveRole] = useState<WorkspaceSummary["role"]>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "MEMBER" | "ADMIN">("MEMBER");
  const [status, setStatus] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const isAdmin = activeRole === "ADMIN";

  const load = async () => {
    if (!workspaceId) return;
    const [membersResponse, invitesResponse, workspacesResponse] = await Promise.all([
      fetch(`/api/workspaces/${workspaceId}/members`),
      fetch(`/api/workspaces/${workspaceId}/invitations`),
      fetch("/api/workspaces"),
    ]);

    if (membersResponse.ok) {
      setMembers((await membersResponse.json()) as WorkspaceMemberItem[]);
    }
    if (invitesResponse.ok) {
      setInvitations((await invitesResponse.json()) as WorkspaceInvitationItem[]);
    }
    if (workspacesResponse.ok) {
      const workspaces = (await workspacesResponse.json()) as WorkspaceSummary[];
      setActiveRole(workspaces.find((workspace) => workspace.id === workspaceId)?.role ?? null);
    }
  };

  useEffect(() => {
    setStatus(null);
    setInviteLink(null);
    load();
  }, [workspaceId]);

  const invite = async () => {
    if (!workspaceId || !email.trim() || !isAdmin) return;
    setStatus(null);
    setInviteLink(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });

    if (response.ok) {
      const data = (await response.json()) as { inviteUrl?: string | null };
      const nextInviteUrl = data.inviteUrl
        ? data.inviteUrl.startsWith("/")
          ? `${window.location.origin}${data.inviteUrl}`
          : data.inviteUrl
        : null;
      setInviteLink(nextInviteUrl);
      setEmail("");
      await load();
      setStatus("Invitation created");
    } else {
      setStatus("Failed to create invitation");
    }
  };

  const updateRole = async (memberId: string, nextRole: WorkspaceMemberItem["role"]) => {
    if (!workspaceId || !isAdmin) return;
    const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role: nextRole }),
    });
    if (response.ok) {
      await load();
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
        <h1 className="text-2xl font-semibold text-foreground">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invite members and manage workspace roles.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Invite user</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="email@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="max-w-sm"
            disabled={!isAdmin}
          />
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "VIEWER" | "MEMBER" | "ADMIN")
            }
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            disabled={!isAdmin}
          >
            <option value="VIEWER">Viewer</option>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <Button onClick={invite} disabled={!isAdmin || !email.trim()}>
            Invite
          </Button>
        </div>
        {!isAdmin ? (
          <p className="text-xs text-muted-foreground">
            Only workspace admins can invite users and change roles.
          </p>
        ) : null}
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        {inviteLink ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Invite link</p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly />
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteLink);
                    setStatus("Invite link copied");
                  } catch {
                    setStatus("Could not copy invite link");
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-3">
        <h2 className="text-lg font-medium text-foreground">
          Pending invitations ({invitations.length})
        </h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between border border-border rounded-md px-3 py-2"
              >
                <div>
                  <p className="text-sm text-foreground">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">{invitation.role}</p>
                </div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-3">
        <h2 className="text-lg font-medium text-foreground">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map((member) => {
            const fullName = `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || "Unknown";
            return (
              <div
                key={member.id}
                className="flex items-center justify-between border border-border rounded-md px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                </div>
                <select
                  value={member.role}
                  onChange={(event) =>
                    updateRole(
                      member.id,
                      event.target.value as "VIEWER" | "MEMBER" | "ADMIN",
                    )
                  }
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                  disabled={!isAdmin}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
