"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  LayoutGrid,
  Folder,
  Settings,
  HelpCircle,
  ChevronDown,
  Check,
  LogOut,
  Plus,
  Sun,
  Moon,
  ChevronsUpDown,
  Search,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function DashboardSidebar({
  children,
}: {
  children:
    | React.ReactNode
    | ((props: {
        sidebarCollapsed: boolean;
        setSidebarCollapsed: (collapsed: boolean) => void;
      }) => React.ReactNode);
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentFolderId = searchParams.get("folderId");
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();
  const currentQuery = searchParams.get("q") || "";
  const searchParamsString = searchParams.toString();
  // Gate user-derived values behind a mounted flag so the first client
  // render matches the server render (where Clerk user data isn't available),
  // avoiding a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("All");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newWorkspaceDialogOpen, setNewWorkspaceDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("New Workspace");
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("New Project");
  const [searchValue, setSearchValue] = useState(currentQuery);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const isScenePage = pathname?.startsWith("/dashboard/scene");
  const hideSidebar = isScenePage && sidebarCollapsed;

  const workspaceName =
    mounted && user?.fullName
      ? `${user.fullName}'s workspace`
      : "My workspace";

  const userInitial = mounted
    ? user?.firstName?.[0] || user?.username?.[0] || ""
    : "";
  const userEmail = mounted
    ? user?.emailAddresses[0]?.emailAddress || ""
    : "";
  const userName = mounted ? user?.fullName || user?.username || "User" : "User";

  const navSections: NavSection[] = [
    {
      title: "Workspace",
      items: [{ icon: <LayoutGrid className="w-4 h-4" />, label: "All" }],
    },
  ];

  // Fetch folders on mount
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

  useEffect(() => {
    setSearchValue(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    if (isScenePage) return; // Scene page uses local search only

    const trimmed = searchValue.trim();
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsString);
      if (trimmed.length >= 2) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      const nextParams = params.toString();
      if (nextParams === searchParamsString) {
        return;
      }
      const nextUrl = nextParams ? `${pathname}?${nextParams}` : pathname;
      router.push(nextUrl);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchValue, pathname, router, searchParamsString, isScenePage]);

  const handleCreateWorkspace = async () => {
    if (newWorkspaceName.trim()) {
      try {
        const response = await fetch("/api/folders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newWorkspaceName.trim(),
            parentFolderId: null, // Workspace is top-level
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create workspace");
        }

        const newFolder = await response.json();
        setFolders([...folders, { id: newFolder.id, name: newFolder.name }]);
        setNewWorkspaceDialogOpen(false);
        setNewWorkspaceName("New Workspace");
      } catch (err) {
        console.error("Error creating workspace:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create workspace",
        );
      }
    }
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      try {
        const response = await fetch("/api/folders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newProjectName.trim(),
            // parentFolderId will be the current workspace/folder - for now, null (top-level)
            parentFolderId: null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create folder");
        }

        const newFolder = await response.json();
        setFolders([...folders, { id: newFolder.id, name: newFolder.name }]);
        setNewProjectDialogOpen(false);
        setNewProjectName("New Project");
      } catch (err) {
        console.error("Error creating folder:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create folder",
        );
      }
    }
  };

  // Sync activeItem with URL on mount and when URL changes
  useEffect(() => {
    if (currentFolderId) {
      setActiveItem(currentFolderId);
    } else {
      setActiveItem("All");
    }
  }, [currentFolderId]);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (workspaceOpen && workspaceButtonRef.current) {
      const rect = workspaceButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px offset (mt-1)
        left: rect.left,
        width: rect.width,
      });
    }
  }, [workspaceOpen]);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 bg-card border-r border-border flex flex-col transition-all duration-300",
          hideSidebar
            ? "w-0 border-r-0 overflow-hidden pointer-events-none opacity-0"
            : sidebarCollapsed
              ? "w-[60px]"
              : "w-[240px]",
        )}
        aria-hidden={hideSidebar}
      >
        {/* Workspace Selector */}
        <div className="p-3">
          {sidebarCollapsed ? (
            // Collapsed view - just avatar
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-[#4ade80] flex items-center justify-center text-black font-semibold text-sm">
                {userInitial}
              </div>
            </div>
          ) : (
            // Expanded view
            <>
              <div className="relative">
                <button
                  ref={workspaceButtonRef}
                  onClick={() => setWorkspaceOpen(!workspaceOpen)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-lg bg-[#4ade80] flex items-center justify-center text-black font-semibold text-sm flex-shrink-0">
                    {userInitial}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {workspaceName.length > 20
                        ? workspaceName.slice(0, 20) + "..."
                        : workspaceName}
                    </div>
                    <div className="text-xs text-muted-foreground">1 Member</div>
                  </div>
                  <ChevronsUpDown className="w-4 h-4" />
                </button>

                {/* Workspace Dropdown - rendered via portal */}
                {workspaceOpen &&
                  typeof window !== "undefined" &&
                  createPortal(
                    <>
                      {/* Backdrop to close on outside click */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setWorkspaceOpen(false)}
                      />
                      {/* Dropdown content */}
                      <div
                        className="fixed bg-popover border border-border rounded-lg shadow-xl z-50 py-2"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`,
                          width: `${dropdownPosition.width}px`,
                          minWidth: "280px", // Ensure minimum width
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* User Info */}
                        <div className="px-3 py-2 border-b border-border">
                          <div className="flex items-center gap-3">
                            {user?.imageUrl ? (
                              <img
                                src={user.imageUrl}
                                alt="Profile"
                                className="w-8 h-8 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[#4ade80] flex items-center justify-center text-black font-semibold text-sm">
                                {userInitial}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {user?.fullName || user?.username}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {userEmail.slice(0, 20)}
                                {userEmail.length > 20 ? "..." : ""}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Workspaces */}
                        <div className="px-2 py-2">
                          <div className="text-xs text-muted-foreground px-2 mb-2">
                            Workspaces
                          </div>
                          <button className="w-full flex items-center gap-3 p-2 rounded-md bg-accent hover:bg-accent/80 transition-colors">
                            <div className="w-6 h-6 rounded bg-[#4ade80] flex items-center justify-center text-black font-semibold text-xs">
                              {userInitial}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm text-foreground truncate">
                                {workspaceName.length > 18
                                  ? workspaceName.slice(0, 18) + "..."
                                  : workspaceName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Free · 1 member
                              </div>
                            </div>
                            <Check className="w-4 h-4 text-[#4ade80]" />
                          </button>

                          <button className="w-full flex items-center gap-2 p-2 mt-1 rounded-md hover:bg-accent transition-colors text-sm text-muted-foreground">
                            <Plus className="w-4 h-4" />
                            Create a new workspace
                          </button>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-border px-2 pt-2 mt-2">
                          <button
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm text-muted-foreground"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    </>,
                    document.body,
                  )}
              </div>
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search scenes"
                    className="w-full h-9 pl-10 pr-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-input transition-colors"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {isScenePage ? (
            <SceneSidebarList query={searchValue} />
          ) : (
            navSections.map((section, idx) => (
              <div key={idx} className="mb-4">
                {!sidebarCollapsed && section.title && (
                  <div className="group px-3 mb-1 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {section.title}
                    </div>
                    <button
                      onClick={() => setNewProjectDialogOpen(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      title="Create folder"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item, itemIdx) => (
                    <button
                      key={itemIdx}
                      onClick={() => {
                        setActiveItem(item.label);
                        // If "All" is clicked, go back to base dashboard without folderId
                        if (item.label === "All") {
                          router.push("/dashboard");
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
                        activeItem === item.label && !currentFolderId
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        sidebarCollapsed && "justify-center px-2",
                      )}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  ))}

                  {/* Render created folders */}
                  {!sidebarCollapsed &&
                    folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setActiveItem(folder.id);
                          router.push(`/dashboard?folderId=${folder.id}`);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
                          activeItem === folder.id ||
                            currentFolderId === folder.id
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <Folder className="w-4 h-4" />
                        <span>{folder.name}</span>
                      </button>
                    ))}

                  {/* Show folders in collapsed view too */}
                  {sidebarCollapsed &&
                    folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setActiveItem(folder.id);
                          router.push(`/dashboard?folderId=${folder.id}`);
                        }}
                        className={cn(
                          "w-full flex items-center justify-center px-2 py-1.5 rounded-md text-sm transition-colors",
                          activeItem === folder.id ||
                            currentFolderId === folder.id
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                        title={folder.name}
                      >
                        <Folder className="w-4 h-4" />
                      </button>
                    ))}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-border">
          {sidebarCollapsed ? (
            // Collapsed bottom actions
            <div className="flex flex-col items-center gap-2">
              <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    title={
                      theme === "dark"
                        ? "Switch to light mode"
                        : "Switch to dark mode"
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-40">
                  <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="w-4 h-4" />
                    Light
                    {theme === "light" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                    {theme === "dark" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const prefersDark = window.matchMedia(
                        "(prefers-color-scheme: dark)",
                      ).matches;
                      setTheme(prefersDark ? "dark" : "light");
                    }}
                    className="flex items-center gap-2"
                  >
                    <ChevronsUpDown className="w-4 h-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                <Settings className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // Expanded bottom actions
            <div className="flex items-center justify-between">
              <Link
                href="/landing"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Link>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      title={
                        theme === "dark"
                          ? "Switch to light mode"
                          : "Switch to dark mode"
                      }
                    >
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4" />
                      ) : (
                        <Moon className="w-4 h-4" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={() => setTheme("light")}
                      className="flex items-center gap-2"
                    >
                      <Sun className="w-4 h-4" />
                      Light
                      {theme === "light" && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme("dark")}
                      className="flex items-center gap-2"
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                      {theme === "dark" && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const prefersDark = window.matchMedia(
                          "(prefers-color-scheme: dark)",
                        ).matches;
                        setTheme(prefersDark ? "dark" : "light");
                      }}
                      className="flex items-center gap-2"
                    >
                      <ChevronsUpDown className="w-4 h-4" />
                      System
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Page Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {typeof children === "function"
            ? children({ sidebarCollapsed, setSidebarCollapsed })
            : children}
        </div>
      </main>

      {/* New Workspace Dialog */}
      <SimpleInputModal
        open={newWorkspaceDialogOpen}
        onOpenChange={setNewWorkspaceDialogOpen}
        title="New Folder"
        value={newWorkspaceName}
        onChange={setNewWorkspaceName}
        onSubmit={handleCreateWorkspace}
        placeholder="New Folder"
        helperText="Folders are accessible to anyone in this organization."
        submitLabel="Done"
      />

      {/* New Folder Dialog */}
      <SimpleInputModal
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
        title="New Folder"
        value={newProjectName}
        onChange={setNewProjectName}
        onSubmit={handleCreateProject}
        placeholder="Folder name"
        helperText="Folders are accessible to anyone in this organization."
        submitLabel="Done"
      />
    </div>
  );
}
