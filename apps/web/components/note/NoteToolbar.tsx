"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

interface NoteToolbarProps {
  excalidrawRef: React.RefObject<ExcalidrawImperativeAPI | null>;
}

export function NoteToolbar({ excalidrawRef }: NoteToolbarProps) {
  const createNote = useCallback(() => {
    const api = excalidrawRef.current;
    if (!api) {
      console.warn('Excalidraw API not available');
      return;
    }

    // Get the center of the current viewport
    const appState = api.getAppState();
    const zoom = appState.zoom?.value || 1;
    const centerX = (appState.width / 2 - appState.scrollX) / zoom;
    const centerY = (appState.height / 2 - appState.scrollY) / zoom;

    // Create note element using the helper
    const createNoteElement = (api as any).createNoteElement;
    if (!createNoteElement) {
      console.error('createNoteElement helper not found on API');
      return;
    }

    try {
      const noteElement = createNoteElement(centerX - 200, centerY - 150, 400, 300);
      console.log('Created note element:', noteElement);
      
      // Add to scene
      const elements = api.getSceneElements();
      console.log('Current elements count:', elements.length);
      
      api.updateScene({
        elements: [...elements, noteElement],
        appState: {
          ...appState,
          selectedElementIds: { [noteElement.id]: true },
        },
      });
      
      console.log('Note element added to scene');
    } catch (error) {
      console.error('Error creating note:', error);
    }
  }, [excalidrawRef]);

  return (
    <div 
      className="flex items-center gap-1" 
      style={{ 
        zIndex: 1000,
        padding: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '4px',
        border: '1px solid #ccc'
      }}
    >
      <button
        onClick={createNote}
        title="Add Note"
        style={{ 
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fff';
        }}
      >
        <FileText className="h-4 w-4" style={{ color: '#333' }} />
      </button>
    </div>
  );
}

export default NoteToolbar;
