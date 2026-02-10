"use client";

import { useRouter } from "next/navigation";
import { Lock, MoreHorizontal } from "lucide-react";
import { ScenePreview } from "./ScenePreview";
import { TimeAgo } from "./TimeAgo";

interface SceneCardProps {
  scene: {
    id: string;
    title: string;
    content?: unknown;
    updatedAt: string;
    lastEditedByName?: string | null;
    lastEditedAt?: string;
    folderId?: string | null;
  };
}

/**
 * SceneCard - Horizontal layout scene card with preview
 * 
 * Matches the design from the reference:
 * - Wide preview image (16:10 aspect ratio)
 * - Title below the preview
 * - "by [FirstName]" author line
 * - Lock icon for private scenes (no folder)
 * - Timestamp badge in the bottom-right of preview
 * - 3-dot menu on hover
 */
export function SceneCard({ scene }: SceneCardProps) {
  const router = useRouter();

  // Get first name only for display
  const authorName = scene.lastEditedByName 
    ? scene.lastEditedByName.split(" ")[0] 
    : "Unknown";

  const handleClick = () => {
    router.push(`/dashboard/scene/${scene.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer"
    >
      {/* Preview Container - aspect ratio matching Excalidraw reference */}
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[#121212] border border-border/50 group-hover:border-border transition-all">
        {/* Scene Preview */}
        <ScenePreview 
          content={scene.content} 
          className="w-full h-full"
        />
        
        {/* Timestamp Badge - Bottom right */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md">
          <TimeAgo 
            date={scene.lastEditedAt || scene.updatedAt} 
            className="text-xs text-white/90 font-medium"
          />
        </div>

        {/* Hover Actions - 3 dot menu */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Show context menu with options
            }}
            className="p-1.5 bg-black/60 backdrop-blur-sm rounded-md hover:bg-black/80 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-white/90" />
          </button>
        </div>
      </div>

      {/* Scene Info - Below Preview */}
      <div className="mt-3 flex items-start justify-between px-0.5">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-sm font-medium text-foreground truncate">
            {scene.title}
          </h3>
          {/* Author */}
          <p className="text-xs text-muted-foreground mt-0.5">
            by {authorName}
          </p>
        </div>
        
        {/* Lock Icon - Show for personal scenes (no folder) */}
        {!scene.folderId && (
          <div className="ml-2 flex-shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-muted-foreground/50" />
          </div>
        )}
      </div>
    </div>
  );
}
