"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  LayoutGrid,
  LogOut,
  Moon,
  PanelsTopLeft,
  Plus,
  Search,
  Settings,
  Sun,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { SimpleInputModal } from "@/components/ui/simple-input-modal";
import { useTheme } from "@/context/ThemeContext";
import { SceneSidebarList } from "../scene/[id]/SceneSidebarList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkspaceItem {
  id: string;
  name: string;
  role?: "VIEWER" | "MEMBER" | "ADMIN" | null;
}

interface CollectionItem {
  id: string;
  name: string;
}

const ACTIVE_WORKSPACE_KEY = "notedraw.activeWorkspaceId";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardSidebar({
  children,
  mode = "dashboard",
  settingsNav,
}: {
  children:
    | React.ReactNode
    | ((props: {
        sidebarCollapsed: boolean;
        setSidebarCollapsed: (collapsed: boolean) => void;
      }) => React.ReactNode);
  mode?: "dashboard" | "settings";
  settingsNav?: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();

  const currentWorkspaceId = searchParams.get("workspaceId");
  const currentCollectionId = searchParams.get("collectionId");
  const currentQuery = searchParams.get("q") || "";
  const isSettingsMode = mode === "settings";
  const isScenePage = !isSettingsMode && pathname?.startsWith("/dashboard/scene");

  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState(currentQuery);

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    currentWorkspaceId,
  );

  const [newWorkspaceDialogOpen, setNewWorkspaceDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("New Workspace");
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("New Collection");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setSearchValue(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await fetch("/api/workspaces");
        if (!response.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        const data = (await response.json()) as WorkspaceItem[];
        setWorkspaces(data);
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      }
    };

    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!workspaces.length) return;

    const storedWorkspaceId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_WORKSPACE_KEY)
        : null;

    const requestedWorkspaceId = currentWorkspaceId;
    const fallbackWorkspaceId =
      requestedWorkspaceId && workspaces.some((w) => w.id === requestedWorkspaceId)
        ? requestedWorkspaceId
        : storedWorkspaceId && workspaces.some((w) => w.id === storedWorkspaceId)
          ? storedWorkspaceId
          : workspaces[0].id;

    if (!fallbackWorkspaceId) return;

    setActiveWorkspaceId(fallbackWorkspaceId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, fallbackWorkspaceId);
    }

    if (requestedWorkspaceId !== fallbackWorkspaceId) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("workspaceId", fallbackWorkspaceId);
      const nextUrl = nextParams.toString()
        ? `${pathname}?${nextParams.toString()}`
        : pathname;
      router.replace(nextUrl);
    }
  }, [workspaces, currentWorkspaceId, pathname, router, searchParams]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setCollections([]);
      return;
    }

    const fetchCollections = async () => {
      try {
        const response = await fetch(
          `/api/collections?workspaceId=${activeWorkspaceId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch collections");
        }
        const data = (await response.json()) as CollectionItem[];
        setCollections(data);
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
    };

    fetchCollections();
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (isScenePage || isSettingsMode) return;

    const trimmed = searchValue.trim();
    const timeout = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (trimmed.length >= 2) {
        nextParams.set("q", trimmed);
      } else {
        nextParams.delete("q");
      }

      if (activeWorkspaceId) {
        nextParams.set("workspaceId", activeWorkspaceId);
      }

      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      if (nextUrl !== currentUrl) {
        router.push(nextUrl);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [
    activeWorkspaceId,
    isScenePage,
    isSettingsMode,
    pathname,
    router,
    searchParams,
    searchValue,
  ]);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null,
    [workspaces, activeWorkspaceId],
  );

  const userName = mounted ? user?.fullName || user?.username || "User" : "User";
  const userEmail = mounted ? user?.emailAddresses[0]?.emailAddress || "" : "";
  const workspaceLabel = activeWorkspace?.name || "Workspace";
  const workspaceInitials = getInitials(workspaceLabel);
  const userInitials = getInitials(userName);
  const hideSidebar = isScenePage && sidebarCollapsed;

  const goToDashboard = () => {
    const params = new URLSearchParams();
    if (activeWorkspaceId) {
      params.set("workspaceId", activeWorkspaceId);
    }
    const nextUrl = params.toString() ? `/dashboard?${params.toString()}` : "/dashboard";
    router.push(nextUrl);
  };

  const selectWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("workspaceId", workspaceId);
    params.delete("collectionId");
    const target = `/dashboard?${params.toString()}`;
    router.push(target);
  };

  const selectCollection = (collectionId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeWorkspaceId) {
      params.set("workspaceId", activeWorkspaceId);
    }
    if (collectionId) {
      params.set("collectionId", collectionId);
    } else {
      params.delete("collectionId");
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to create workspace");
      }
      const created = (await response.json()) as WorkspaceItem;
      setWorkspaces((prev) => [created, ...prev]);
      setNewWorkspaceDialogOpen(false);
      setNewWorkspaceName("New Workspace");
      selectWorkspace(created.id);
    } catch (error) {
      console.error("Error creating workspace:", error);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim() || !activeWorkspaceId) return;

    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          name: newCollectionName.trim(),
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create collection");
      }
      const created = (await response.json()) as CollectionItem;
      setCollections((prev) => [...prev, created]);
      setNewCollectionDialogOpen(false);
      setNewCollectionName("New Collection");
    } catch (error) {
      console.error("Error creating collection:", error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <aside
        className={cn(
          "flex-shrink-0 bg-card border-r border-border flex flex-col transition-all duration-300",
          hideSidebar
            ? "w-0 border-r-0 overflow-hidden pointer-events-none opacity-0"
            : sidebarCollapsed
              ? "w-[60px]"
              : "w-[260px]",
        )}
        aria-hidden={hideSidebar}
      >
        <div className="p-3 border-b border-border">
          {sidebarCollapsed ? (
            <button
              className="w-8 h-8 rounded-lg bg-emerald-400/90 text-black text-xs font-semibold mx-auto"
              onClick={() => {
                if (isSettingsMode) {
                  goToDashboard();
                  return;
                }
                setSidebarCollapsed(false);
              }}
              title={workspaceLabel}
            >
              {workspaceInitials}
            </button>
          ) : (
            <>
              {isSettingsMode ? (
                <button
                  onClick={goToDashboard}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                  title="Back to dashboard"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-400/90 text-black flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {workspaceInitials}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-sm font-medium text-foreground truncate">
                      {workspaceLabel}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Back to dashboard
                    </div>
                  </div>
                </button>
              ) : (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-400/90 text-black flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {workspaceInitials}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="text-sm font-medium text-foreground truncate">
                            {workspaceLabel}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {activeWorkspace?.role || "MEMBER"}
                          </div>
                        </div>
                        <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/settings/workspace/settings?workspaceId=${activeWorkspaceId || ""}`,
                          )
                        }
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Workspace settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/settings/workspace/members?workspaceId=${activeWorkspaceId || ""}`,
                          )
                        }
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Team members
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/settings/subscription/billing?workspaceId=${activeWorkspaceId || ""}`,
                          )
                        }
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Billing
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/settings/account/profile")}
                      >
                        <User className="w-4 h-4 mr-2" />
                        User account
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
                      {workspaces.map((workspace) => (
                        <DropdownMenuItem
                          key={workspace.id}
                          onClick={() => selectWorkspace(workspace.id)}
                          className="flex items-center gap-2"
                        >
                          <span className="truncate">{workspace.name}</span>
                          {activeWorkspaceId === workspace.id ? (
                            <Check className="w-4 h-4 ml-auto text-emerald-500" />
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setNewWorkspaceDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="Search scenes"
                      className="w-full h-9 pl-10 pr-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-input transition-colors"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {isSettingsMode ? (
            settingsNav || null
          ) : isScenePage ? (
            <SceneSidebarList query={searchValue} workspaceId={activeWorkspaceId} />
          ) : (
            <div className="space-y-2">
              {!sidebarCollapsed && (
                <div className="px-3 pt-1 pb-0.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Collections</span>
                  <button
                    className="p-1 rounded hover:bg-secondary text-muted-foreground"
                    onClick={() => setNewCollectionDialogOpen(true)}
                    title="New collection"
                    disabled={!activeWorkspaceId}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={() => selectCollection(undefined)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
                  !currentCollectionId
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  sidebarCollapsed && "justify-center px-2",
                )}
                title={sidebarCollapsed ? "All scenes" : undefined}
              >
                <LayoutGrid className="w-4 h-4" />
                {!sidebarCollapsed && <span>All scenes</span>}
              </button>

              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => selectCollection(collection.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
                    currentCollectionId === collection.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    sidebarCollapsed && "justify-center px-2",
                  )}
                  title={sidebarCollapsed ? collection.name : undefined}
                >
                  <PanelsTopLeft className="w-4 h-4" />
                  {!sidebarCollapsed && (
                    <span className="truncate">{collection.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-border p-3">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                className="w-8 h-8 rounded-lg bg-secondary text-foreground text-xs font-semibold"
                title={userName}
              >
                {userInitials}
              </button>
              <button
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
                onClick={() => signOut()}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-border p-2.5 bg-background/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary text-foreground text-xs font-semibold flex items-center justify-center">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">
                    {userName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                      <Settings className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push("/settings/account/profile")}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/settings/account/preferences")}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Preferences
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <Link
                  href="/landing"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Back
                </Link>
                <button
                  className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() =>
                    setTheme(
                      theme === "dark" ? "light" : "dark",
                    )
                  }
                  title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? (
                    <span className="inline-flex items-center gap-1">
                      <Sun className="w-3 h-3" />
                      Light
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Moon className="w-3 h-3" />
                      Dark
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex flex-col min-w-0">
          {typeof children === "function"
            ? children({ sidebarCollapsed, setSidebarCollapsed })
            : children}
        </div>
      </main>

      <SimpleInputModal
        open={newWorkspaceDialogOpen}
        onOpenChange={setNewWorkspaceDialogOpen}
        title="Create workspace"
        value={newWorkspaceName}
        onChange={setNewWorkspaceName}
        onSubmit={createWorkspace}
        placeholder="Workspace name"
        helperText="Create a separate workspace and invite teammates later from settings."
        submitLabel="Create"
      />

      <SimpleInputModal
        open={newCollectionDialogOpen}
        onOpenChange={setNewCollectionDialogOpen}
        title="Create collection"
        value={newCollectionName}
        onChange={setNewCollectionName}
        onSubmit={createCollection}
        placeholder="Collection name"
        helperText="Collections organize scenes inside the current workspace."
        submitLabel="Create"
      />
    </div>
  );
}
