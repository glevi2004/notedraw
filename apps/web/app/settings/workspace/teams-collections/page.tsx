"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TeamItem {
  id: string;
  name: string;
  _count: {
    members: number;
    collections: number;
  };
}

interface CollectionItem {
  id: string;
  name: string;
  teamLinks: Array<{
    team: {
      id: string;
      name: string;
    };
  }>;
}

export default function TeamsCollectionsPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [teamName, setTeamName] = useState("Design");

  const load = async () => {
    if (!workspaceId) return;
    const response = await fetch(`/api/workspaces/${workspaceId}/teams`);
    if (!response.ok) return;
    const data = (await response.json()) as {
      teams: TeamItem[];
      collections: CollectionItem[];
    };
    setTeams(data.teams);
    setCollections(data.collections);
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const createTeam = async () => {
    if (!workspaceId || !teamName.trim()) return;
    const response = await fetch(`/api/workspaces/${workspaceId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName.trim() }),
    });
    if (response.ok) {
      setTeamName("Design");
      await load();
    }
  };

  const linkTeamCollection = async (teamId: string, collectionId: string) => {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/teams/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, collectionId }),
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
        <h1 className="text-2xl font-semibold text-foreground">Teams & Collections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create teams and scope collection access.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Create team</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
          />
          <Button onClick={createTeam}>Create team</Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-3">
        <h2 className="text-lg font-medium text-foreground">Teams</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams yet.</p>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="border border-border rounded-md px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-foreground">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team._count.members} members · {team._count.collections} collections
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-3">
        <h2 className="text-lg font-medium text-foreground">Collections</h2>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No collections yet.</p>
        ) : (
          <div className="space-y-2">
            {collections.map((collection) => (
              <div key={collection.id} className="border border-border rounded-md p-3">
                <p className="text-sm font-medium text-foreground">{collection.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {collection.teamLinks.length
                    ? `Teams: ${collection.teamLinks.map((link) => link.team.name).join(", ")}`
                    : "Access: everyone in workspace"}
                </p>
                {teams.length > 0 ? (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => linkTeamCollection(team.id, collection.id)}
                        className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        Assign {team.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
