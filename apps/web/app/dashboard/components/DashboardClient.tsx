'use client';

import { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { DashboardSidebar } from './DashboardSidebar';
import { Search, Users, Plus, LayoutGrid, MoreHorizontal, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Project {
  id: string;
  title: string;
  lastEdited: string;
  editedBy: string;
}

interface Folder {
  id: string;
  name: string;
}

export function DashboardClient() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('New Folder');
  const [folders, setFolders] = useState<Folder[]>([
    { id: '1', name: 'New Folder' }
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState('Shared');

  const userName = user?.fullName || user?.username || 'User';

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: Folder = {
        id: Date.now().toString(),
        name: newFolderName.trim()
      };
      setFolders([...folders, newFolder]);
      setNewFolderDialogOpen(false);
      setNewFolderName('New Folder');
    }
  };

  const handleCreateProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      title: 'Untitled',
      lastEdited: 'today',
      editedBy: userName
    };
    setProjects([...projects, newProject]);
  };

  return (
    <DashboardSidebar>
      {({ sidebarCollapsed, setSidebarCollapsed }) => (
        <>
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-6 border-b border-border">
            {/* Left side with sidebar toggle and title */}
            <div className="flex items-center gap-3 min-w-[120px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <PanelLeft className="w-5 h-5" />
              </Button>
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
                  className="w-full h-9 pl-10 pr-4 bg-[#141414] border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#333] transition-colors"
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
                onClick={handleCreateProject}
                className="bg-white text-black hover:bg-white/90 text-sm font-medium px-4"
              >
                New project
              </Button>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
        {projects.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-12 h-12 rounded-lg bg-[#141414] flex items-center justify-center mb-4">
              <LayoutGrid className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-lg text-foreground">No projects</p>
          </div>
        ) : (
          // Projects Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-[#0a0a0a] border border-border rounded-xl overflow-hidden hover:border-[#333] transition-all cursor-pointer"
              >
                {/* Project Preview */}
                <div className="aspect-[4/3] bg-[#141414] flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]" />
                </div>
                
                {/* Project Info */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    {project.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Edited {project.lastEdited} by {project.editedBy}
                  </p>
                </div>

                {/* Hover Actions */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 bg-[#1a1a1a] rounded-md hover:bg-[#252525] transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>

          {/* New Folder Dialog */}
          <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
            <DialogContent className="bg-[#141414] border-border max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-medium text-foreground">New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-[#0a0a0a] border-border text-foreground focus:border-[#333]"
                  placeholder="Folder name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Folders are accessible to anyone in this organization.
                </p>
                <Button 
                  onClick={handleCreateFolder}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </DashboardSidebar>
  );
}
