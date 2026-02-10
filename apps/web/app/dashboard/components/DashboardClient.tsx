"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { SidebarTrigger } from "./SidebarTrigger";
import {
  Search,
  Users,
  Plus,
  LayoutGrid,
  MoreHorizontal,
  PencilLine,
} from "lucide-react";
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

interface Scene {
  id: string;
  title: string;
  content?: unknown;
  folderId?: string | null;
  lastEditedAt?: string;
  lastEditedBy?: string;
  lastEditedByName?: string | null;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
}

export function DashboardClient() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("New Folder");
  const [newSceneDialogOpen, setNewSceneDialogOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState("Untitled");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("Shared");

  // Get folderId from URL params
  const selectedFolderId = searchParams.get("folderId");

  const userName = user?.fullName || user?.username || "User";

  // Fetch workspaces (top-level folders) on mount
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/folders?parentFolderId=");
        if (!response.ok) {
          throw new Error("Failed to fetch folders");
        }
        const data = await response.json();
        setFolders(data.map((f: any) => ({ id: f.id, name: f.name })));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch folders",
        );
        console.error("Error fetching folders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();
  }, []);

  // Fetch scenes - all scenes if no folderId, or filtered by folderId
  useEffect(() => {
    const fetchScenes = async () => {
      try {
        setScenesLoading(true);
        setError(null);
        const url = selectedFolderId
          ? `/api/scenes?folderId=${selectedFolderId}`
          : "/api/scenes";
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
  }, [selectedFolderId]);

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const response = await fetch("/api/folders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newFolderName.trim(),
            parentFolderId: selectedFolderId || null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create folder");
        }

        const newFolder = await response.json();
        setFolders([...folders, { id: newFolder.id, name: newFolder.name }]);
        setNewFolderDialogOpen(false);
        setNewFolderName("New Folder");
      } catch (err) {
        console.error("Error creating folder:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create folder",
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
          folderId: selectedFolderId || null, // Allow null if no folder selected
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
      router.push(`/dashboard/scene/${newScene.id}`);
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

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-input transition-colors"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 min-w-[280px] justify-end">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Users className="w-4 h-4" />
            <span>1</span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Invite
          </Button>
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
            <p className="text-lg text-foreground">No scenes</p>
          </div>
        ) : (
          // Scenes Grid - 4 columns like Excalidraw reference
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {scenes.map((scene) => (
              <SceneCard key={scene.id} scene={scene} />
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-foreground">
              New Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="bg-card border-border text-foreground focus:border-input"
              placeholder="Folder name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Folders are accessible to anyone in this organization.
            </p>
            <Button
              onClick={handleCreateFolder}
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
        helperText="Create a new scene. It will appear in 'All' if no folder is selected."
        submitLabel="Done"
      />
    </>
  );
}
