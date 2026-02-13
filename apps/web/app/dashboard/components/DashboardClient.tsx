"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { SidebarTrigger } from "./SidebarTrigger";
import { Plus, LayoutGrid, MoreHorizontal, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleInputModal } from "@/components/ui/simple-input-modal";
import { SceneCard } from "@/components/SceneCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Scene {
  id: string;
  title: string;
  content?: unknown;
  workspaceId: string;
  collectionId?: string | null;
  folderId?: string | null;
  lastEditedAt?: string;
  lastEditedBy?: string;
  lastEditedByName?: string | null;
  updatedAt: string;
}

interface Collection {
  id: string;
  name: string;
}

export function DashboardClient() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("New Collection");
  const [newSceneDialogOpen, setNewSceneDialogOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState("Untitled");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("Shared");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameSceneId, setRenameSceneId] = useState<string | null>(null);
  const [renameSceneName, setRenameSceneName] = useState("");
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveSceneId, setMoveSceneId] = useState<string | null>(null);
  const [moveCollectionId, setMoveCollectionId] = useState<string>("none");

  const selectedWorkspaceId = searchParams.get("workspaceId");
  const selectedCollectionId =
    searchParams.get("collectionId") || searchParams.get("folderId");
  const rawQuery = searchParams.get("q") || "";
  const normalizedQuery = rawQuery.trim();
  const hasSearch = normalizedQuery.length >= 2;

  const userName = user?.fullName || user?.username || "User";

  // Fetch collections for current workspace
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        if (!selectedWorkspaceId) {
          setCollections([]);
          setLoading(false);
          return;
        }

        setLoading(false);
        setError(null);
        const response = await fetch(
          `/api/collections?workspaceId=${selectedWorkspaceId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch collections");
        }
        const data = await response.json();
        setCollections(data.map((collection: any) => ({ id: collection.id, name: collection.name })));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch collections",
        );
        console.error("Error fetching collections:", err);
      }
    };

    fetchCollections();
  }, [selectedWorkspaceId]);

  // Fetch scenes scoped by workspace and optional collection
  useEffect(() => {
    const fetchScenes = async () => {
      try {
        setScenesLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (selectedWorkspaceId) {
          params.set("workspaceId", selectedWorkspaceId);
        }
        if (selectedCollectionId) {
          params.set("collectionId", selectedCollectionId);
        }
        if (hasSearch) {
          params.set("q", normalizedQuery);
          if (selectedCollectionId) {
            params.set("includeAll", "1");
          }
        }
        const url = params.toString() ? `/api/scenes?${params.toString()}` : "/api/scenes";
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch scenes");
        }
        const data = await response.json();
        setScenes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch scenes");
        console.error("Error fetching scenes:", err);
      } finally {
        setScenesLoading(false);
      }
    };

    fetchScenes();
  }, [selectedWorkspaceId, selectedCollectionId, hasSearch, normalizedQuery]);

  const handleCreateCollection = async () => {
    if (newCollectionName.trim() && selectedWorkspaceId) {
      try {
        const response = await fetch("/api/collections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newCollectionName.trim(),
            workspaceId: selectedWorkspaceId,
            parentId: null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create collection");
        }

        const newCollection = await response.json();
        setCollections([...collections, { id: newCollection.id, name: newCollection.name }]);
        setNewCollectionDialogOpen(false);
        setNewCollectionName("New Collection");
      } catch (err) {
        console.error("Error creating collection:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create collection",
        );
      }
    }
  };

  const handleCreateProject = async () => {
    if (!newSceneName.trim()) {
      setError("Scene name is required");
      return;
    }

    try {
      const response = await fetch("/api/scenes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newSceneName.trim(),
          workspaceId: selectedWorkspaceId,
          collectionId: selectedCollectionId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create scene");
      }

      const newScene = await response.json();
      setScenes([newScene, ...scenes]);
      setNewSceneDialogOpen(false);
      setNewSceneName("Untitled");

      // Navigate to the new scene's editor
      router.push(
        selectedWorkspaceId
          ? `/dashboard/scene/${newScene.id}?workspaceId=${selectedWorkspaceId}`
          : `/dashboard/scene/${newScene.id}`,
      );
    } catch (err) {
      console.error("Error creating scene:", err);
      setError(err instanceof Error ? err.message : "Failed to create scene");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const scenesById = useMemo(() => {
    return new Map(scenes.map((scene) => [scene.id, scene]));
  }, [scenes]);

  const inCollectionScenes =
    hasSearch && selectedCollectionId
      ? scenes.filter(
          (scene) =>
            (scene.collectionId ?? scene.folderId ?? null) === selectedCollectionId,
        )
      : scenes;
  const otherScenes =
    hasSearch && selectedCollectionId
      ? scenes.filter(
          (scene) =>
            (scene.collectionId ?? scene.folderId ?? null) !== selectedCollectionId,
        )
      : [];

  const openRenameDialog = (sceneId: string) => {
    const scene = scenesById.get(sceneId);
    if (!scene) return;
    setRenameSceneId(sceneId);
    setRenameSceneName(scene.title);
    setRenameDialogOpen(true);
  };

  const submitRename = async () => {
    if (!renameSceneId) return;
    const title = renameSceneName.trim();
    if (!title) {
      setError("Scene name is required");
      return;
    }

    try {
      const response = await fetch(`/api/scenes/${renameSceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename scene");
      }

      setScenes((prev) =>
        prev.map((scene) =>
          scene.id === renameSceneId ? { ...scene, title } : scene,
        ),
      );
      setRenameDialogOpen(false);
      setRenameSceneId(null);
      setRenameSceneName("");
    } catch (err) {
      console.error("Error renaming scene:", err);
      setError(err instanceof Error ? err.message : "Failed to rename scene");
    }
  };

  const handleDuplicate = async (sceneId: string) => {
    const scene = scenesById.get(sceneId);
    if (!scene) return;

    try {
      const response = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${scene.title} (copy)`,
          workspaceId: scene.workspaceId,
          collectionId: scene.collectionId ?? scene.folderId ?? null,
          content: scene.content || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate scene");
      }

      const newScene = await response.json();
      const newSceneCollectionId =
        newScene.collectionId ?? newScene.folderId ?? null;
      if (!selectedCollectionId || newSceneCollectionId === selectedCollectionId) {
        setScenes((prev) => [newScene, ...prev]);
      }
    } catch (err) {
      console.error("Error duplicating scene:", err);
      setError(err instanceof Error ? err.message : "Failed to duplicate scene");
    }
  };

  const openMoveDialog = (sceneId: string) => {
    const scene = scenesById.get(sceneId);
    if (!scene) return;
    setMoveSceneId(sceneId);
    setMoveCollectionId(scene.collectionId ?? scene.folderId ?? "none");
    setMoveDialogOpen(true);
  };

  const submitMove = async () => {
    if (!moveSceneId) return;
    const collectionId = moveCollectionId === "none" ? null : moveCollectionId;

    try {
      const response = await fetch(`/api/scenes/${moveSceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to move scene");
      }

      const updated = await response.json();
      const updatedCollectionId = updated.collectionId ?? updated.folderId ?? null;
      setScenes((prev) => {
        if (selectedCollectionId && updatedCollectionId !== selectedCollectionId) {
          return prev.filter((scene) => scene.id !== moveSceneId);
        }
        return prev.map((scene) =>
          scene.id === moveSceneId
            ? { ...scene, collectionId: updatedCollectionId, folderId: updatedCollectionId }
            : scene,
        );
      });

      setMoveDialogOpen(false);
      setMoveSceneId(null);
      setMoveCollectionId("none");
    } catch (err) {
      console.error("Error moving scene:", err);
      setError(err instanceof Error ? err.message : "Failed to move scene");
    }
  };

  const handleDelete = async (sceneId: string) => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete scene");
      }

      setScenes((prev) => prev.filter((scene) => scene.id !== sceneId));
    } catch (err) {
      console.error("Error deleting scene:", err);
      setError(err instanceof Error ? err.message : "Failed to delete scene");
    }
  };

  return (
    <>
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-border">
        {/* Left side with sidebar trigger and title */}
        <div className="flex items-center gap-3 min-w-[120px]">
          <SidebarTrigger />
          <h1 className="text-base font-medium text-foreground">
            {activeView}
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 min-w-[280px] justify-end">
          <Button
            size="sm"
            onClick={() => {
              setNewSceneDialogOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium px-4"
            disabled={scenesLoading}
          >
            <PencilLine className="w-4 h-4 mr-2" />
            Start drawing
          </Button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          // Initial Loading State (only on first load)
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
              <LayoutGrid className="w-6 h-6 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-lg text-foreground">Loading...</p>
          </div>
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
              <LayoutGrid className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-lg text-foreground text-red-500">{error}</p>
          </div>
        ) : scenes.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
              <LayoutGrid className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-lg text-foreground">
              {hasSearch ? `No results for "${normalizedQuery}"` : "No scenes"}
            </p>
          </div>
        ) : hasSearch && selectedCollectionId ? (
          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-foreground">
                  In this collection
                </h2>
                <span className="text-xs text-muted-foreground">
                  {inCollectionScenes.length} result{inCollectionScenes.length === 1 ? "" : "s"}
                </span>
              </div>
              {inCollectionScenes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No matches in this collection.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {inCollectionScenes.map((scene) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      onRename={openRenameDialog}
                      onDuplicate={handleDuplicate}
                      onMove={openMoveDialog}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-foreground">
                  Other scenes
                </h2>
                <span className="text-xs text-muted-foreground">
                  {otherScenes.length} result{otherScenes.length === 1 ? "" : "s"}
                </span>
              </div>
              {otherScenes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other matches.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {otherScenes.map((scene) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      onRename={openRenameDialog}
                      onDuplicate={handleDuplicate}
                      onMove={openMoveDialog}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Scenes Grid - 4 columns like Excalidraw reference
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                onRename={openRenameDialog}
                onDuplicate={handleDuplicate}
                onMove={openMoveDialog}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Collection Dialog */}
      <Dialog open={newCollectionDialogOpen} onOpenChange={setNewCollectionDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-foreground">
              New Collection
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="bg-card border-border text-foreground focus:border-input"
              placeholder="Collection name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateCollection();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Collections are visible to workspace members.
            </p>
            <Button
              onClick={handleCreateCollection}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Scene Dialog */}
      <SimpleInputModal
        open={newSceneDialogOpen}
        onOpenChange={(open) => {
          setNewSceneDialogOpen(open);
          if (!open) {
            setNewSceneName("Untitled");
          }
        }}
        title="New Scene"
        value={newSceneName}
        onChange={setNewSceneName}
        onSubmit={handleCreateProject}
        placeholder="Scene name"
        helperText="Create a new scene. It will appear in 'All scenes' if no collection is selected."
        submitLabel="Done"
      />

      {/* Rename Scene Dialog */}
      <SimpleInputModal
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open);
          if (!open) {
            setRenameSceneId(null);
            setRenameSceneName("");
          }
        }}
        title="Rename Scene"
        value={renameSceneName}
        onChange={setRenameSceneName}
        onSubmit={submitRename}
        placeholder="Scene name"
        helperText="Update the scene title."
        submitLabel="Rename"
      />

      {/* Move Scene Dialog */}
      <Dialog
        open={moveDialogOpen}
        onOpenChange={(open) => {
          setMoveDialogOpen(open);
          if (!open) {
            setMoveSceneId(null);
            setMoveCollectionId("none");
          }
        }}
      >
        <DialogContent className="bg-popover border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-foreground">
              Move Scene
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={moveCollectionId} onValueChange={setMoveCollectionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No collection</SelectItem>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={submitMove}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Move
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
