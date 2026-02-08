'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutGrid,
  Folder,
  Settings,
  HelpCircle,
  ChevronDown,
  Check,
  LogOut,
  Plus,
  PanelLeft,
  Sun,
  Moon,
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { SimpleInputModal } from '@/components/ui/simple-input-modal';
import { useTheme } from '@/context/ThemeContext';

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
  children 
}: { 
  children: React.ReactNode | ((props: { sidebarCollapsed: boolean; setSidebarCollapsed: (collapsed: boolean) => void }) => React.ReactNode) 
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, toggleTheme } = useTheme();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('Shared with me');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newWorkspaceDialogOpen, setNewWorkspaceDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('New Workspace');
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('New Project');
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const workspaceName = user?.fullName 
    ? `${user.fullName}'s workspace` 
    : "My workspace";

  const userInitial = user?.firstName?.[0] || user?.username?.[0] || 'G';
  const userEmail = user?.emailAddresses[0]?.emailAddress || '';
  const userName = user?.fullName || user?.username || 'User';

  const navSections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { icon: <LayoutGrid className="w-4 h-4" />, label: 'All' },
        { icon: <Folder className="w-4 h-4" />, label: 'New Folder' },
      ],
    },
  ];

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim()) {
      // TODO: Implement workspace creation logic
      console.log('Creating workspace:', newWorkspaceName.trim());
      setNewWorkspaceDialogOpen(false);
      setNewWorkspaceName('New Workspace');
    }
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      // TODO: Implement project creation logic
      console.log('Creating project:', newProjectName.trim());
      setNewProjectDialogOpen(false);
      setNewProjectName('New Project');
    }
  };

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
          "flex-shrink-0 bg-[#0a0a0a] border-r border-border flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-[60px]" : "w-[240px]"
        )}
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
            <div className="relative">
              <button
                ref={workspaceButtonRef}
                onClick={() => setWorkspaceOpen(!workspaceOpen)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#141414] transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-[#4ade80] flex items-center justify-center text-black font-semibold text-sm flex-shrink-0">
                  {userInitial}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {workspaceName.length > 20 ? workspaceName.slice(0, 20) + '...' : workspaceName}
                  </div>
                  <div className="text-xs text-muted-foreground">1 Member</div>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
                  workspaceOpen && "rotate-180"
                )} />
              </button>

              {/* Workspace Dropdown - rendered via portal */}
              {workspaceOpen && typeof window !== 'undefined' && createPortal(
                <>
                  {/* Backdrop to close on outside click */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setWorkspaceOpen(false)}
                  />
                  {/* Dropdown content */}
                  <div
                    className="fixed bg-[#141414] border border-border rounded-lg shadow-xl z-50 py-2"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      width: `${dropdownPosition.width}px`,
                      minWidth: '280px', // Ensure minimum width
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
                            {userEmail.slice(0, 20)}{userEmail.length > 20 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Workspaces */}
                    <div className="px-2 py-2">
                      <div className="text-xs text-muted-foreground px-2 mb-2">Workspaces</div>
                      <button className="w-full flex items-center gap-3 p-2 rounded-md bg-[#1a1a1a] hover:bg-[#222] transition-colors">
                        <div className="w-6 h-6 rounded bg-[#4ade80] flex items-center justify-center text-black font-semibold text-xs">
                          {userInitial}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm text-foreground truncate">
                            {workspaceName.length > 18 ? workspaceName.slice(0, 18) + '...' : workspaceName}
                          </div>
                          <div className="text-xs text-muted-foreground">Free · 1 member</div>
                        </div>
                        <Check className="w-4 h-4 text-[#4ade80]" />
                      </button>

                      <button className="w-full flex items-center gap-2 p-2 mt-1 rounded-md hover:bg-[#1a1a1a] transition-colors text-sm text-muted-foreground">
                        <Plus className="w-4 h-4" />
                        Create a new workspace
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-border px-2 pt-2 mt-2">
                      <button 
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-[#1a1a1a] transition-colors text-sm text-muted-foreground"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {navSections.map((section, idx) => (
            <div key={idx} className="mb-4">
              {!sidebarCollapsed && section.title && (
                <div className="group px-3 mb-1 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{section.title}</div>
                  <button
                    onClick={() => setNewWorkspaceDialogOpen(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#141414] text-muted-foreground hover:text-foreground"
                    title="Create workspace"
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
                      if (item.label === 'New Folder') {
                        setNewProjectDialogOpen(true);
                      } else {
                        setActiveItem(item.label);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
                      activeItem === item.label
                        ? "bg-[#141414] text-foreground"
                        : "text-muted-foreground hover:bg-[#141414] hover:text-foreground",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-border">
          {sidebarCollapsed ? (
            // Collapsed bottom actions
            <div className="flex flex-col items-center gap-2">
              <button className="p-1.5 rounded-md hover:bg-[#141414] transition-colors text-muted-foreground">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-md hover:bg-[#141414] transition-colors text-muted-foreground hover:text-foreground"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
              <button className="p-1.5 rounded-md hover:bg-[#141414] transition-colors text-muted-foreground">
                <Settings className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-md hover:bg-[#141414] transition-colors text-muted-foreground">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // Expanded bottom actions
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#141414] transition-colors text-sm text-muted-foreground">
                <LayoutGrid className="w-4 h-4" />
                <span>1K</span>
              </button>
              <div className="flex items-center gap-1">
                <button 
                  onClick={toggleTheme}
                  className="p-1.5 rounded-md hover:bg-[#141414] transition-colors text-muted-foreground hover:text-foreground"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>
                <button className="p-1.5 rounded-md hover:bg-[#141414] transition-colors text-muted-foreground">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-[#141414] transition-colors text-muted-foreground">
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
          {typeof children === 'function' 
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
        placeholder="New Folder"
        helperText="Folders are accessible to anyone in this organization."
        submitLabel="Done"
      />
    </div>
  );
}
