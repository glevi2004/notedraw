"use client";

import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";

interface SidebarTriggerProps {
  className?: string;
}

export function SidebarTrigger({ className }: SidebarTriggerProps) {
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      className={cn(
        "h-8 w-8 text-muted-foreground hover:text-foreground",
        className,
      )}
      title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}
