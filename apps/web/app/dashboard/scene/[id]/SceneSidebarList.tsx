"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock, MoreHorizontal } from "lucide-react";
import { ScenePreview } from "@/components/ScenePreview";
import { TimeAgo } from "@/components/TimeAgo";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SceneSidebarListProps {
  query: string;
  workspaceId?: string | null;
}

interface SceneListItem {
  id: string;
  title: string;
  content?: unknown;
  workspaceId: string;
  collectionId?: string | null;
  updatedAt: string;
  lastEditedAt?: string | null;
  lastEditedByName?: string | null;
}

// Sidebar list shown only inside the scene editor page.
// Fetches scenes (optionally filtered by search) and highlights the active one.
export function SceneSidebarList({ query, workspaceId }: SceneSidebarListProps) {
  const [scenes, setScenes] = useState<SceneListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const activeId = useMemo(() => pathname.split("/").pop() || "", [pathname]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      const params = new URLSearchParams({ includeAll: "1" });
      const trimmed = query.trim();
      if (workspaceId) {
        params.set("workspaceId", workspaceId);
      }
      if (trimmed.length >= 2) {
        params.set("q", trimmed);
      }

      try {
        const res = await fetch(`/api/scenes?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as SceneListItem[];
        setScenes(data);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("SceneSidebarList fetch failed", err);
        }
      } finally {
        setLoading(false);
      }
    };

    const timeout = window.setTimeout(run, 250); // debounce typing
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, workspaceId]);

  const list = useMemo(() => scenes.slice(0, 100), [scenes]);

  if (loading) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">Loading scenes…</div>
    );
  }

  if (!list.length) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {query.trim().length >= 2 ? "No scenes match your search." : "No scenes yet."}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1 pb-3">
      {list.map((scene) => {
        const isActive = scene.id === activeId;

        const handleRename = async () => {
          const nextTitle = window.prompt("Rename scene", scene.title);
          if (!nextTitle || !nextTitle.trim()) return;
          try {
            const res = await fetch(`/api/scenes/${scene.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: nextTitle.trim() }),
            });
            if (!res.ok) return;
            setScenes((prev) =>
              prev.map((s) => (s.id === scene.id ? { ...s, title: nextTitle.trim() } : s)),
            );
          } catch (err) {
            console.error("Rename failed", err);
          }
        };

        const handleDuplicate = async () => {
          try {
            const res = await fetch("/api/scenes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `${scene.title} (copy)`,
                workspaceId: scene.workspaceId,
                collectionId: scene.collectionId || null,
                content: scene.content || null,
              }),
            });
            if (!res.ok) return;
            const created = await res.json();
            setScenes((prev) => [created, ...prev]);
          } catch (err) {
            console.error("Duplicate failed", err);
          }
        };

        const handleMove = async () => {
          const collectionId = window.prompt(
            "Move to collection id (or leave blank for none)",
            scene.collectionId || "",
          );
          if (collectionId === null) return;
          const normalized = collectionId.trim() || null;
          try {
            const res = await fetch(`/api/scenes/${scene.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ collectionId: normalized }),
            });
            if (!res.ok) return;
            setScenes((prev) =>
              prev.map((s) =>
                s.id === scene.id ? { ...s, collectionId: normalized } : s,
              ),
            );
          } catch (err) {
            console.error("Move failed", err);
          }
        };

        const handleDelete = async () => {
          const confirmed = window.confirm("Delete this scene?");
          if (!confirmed) return;
          try {
            const res = await fetch(`/api/scenes/${scene.id}`, { method: "DELETE" });
            if (!res.ok) return;
            setScenes((prev) => prev.filter((s) => s.id !== scene.id));
          } catch (err) {
            console.error("Delete failed", err);
          }
        };

        const navigateToScene = () =>
          router.push(`/dashboard/scene/${scene.id}?workspaceId=${scene.workspaceId}`);

        return (
          <div
            key={scene.id}
            role="button"
            tabIndex={0}
            onClick={navigateToScene}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigateToScene();
              }
            }}
            className={cn(
              "relative group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors border border-transparent cursor-pointer",
              isActive
                ? "bg-primary/10 border-primary/30"
                : "hover:bg-secondary"
            )}
          >
            <div className="w-12 h-12 flex-shrink-0 overflow-hidden bg-card border border-border">
              <ScenePreview content={scene.content} className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <div className="text-sm font-medium text-foreground truncate">
                {scene.title}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                by {scene.lastEditedByName || "Unknown"}
              </div>
              <div className="text-xs text-muted-foreground">
                <TimeAgo date={scene.lastEditedAt || scene.updatedAt} />
              </div>
            </div>
            <div
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right">
                  <DropdownMenuItem onSelect={handleRename}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleDuplicate}>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleMove}>Move</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleDelete} className="text-red-500">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {!scene.collectionId && (
              <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0 absolute bottom-2 right-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default SceneSidebarList;
