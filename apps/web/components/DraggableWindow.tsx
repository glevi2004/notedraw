'use client';

import { useState, useRef, useCallback, type ReactNode, useEffect } from 'react';
import { Resizable } from 're-resizable';
import { X, Minus, Square, GripVertical } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface DraggableWindowProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultPosition: Position;
  defaultSize: Size;
  minWidth?: number;
  minHeight?: number;
  zIndex: number;
  onFocus: () => void;
  onClose?: () => void;
  className?: string;
}

export default function DraggableWindow({
  title,
  children,
  defaultPosition,
  defaultSize,
  minWidth = 300,
  minHeight = 200,
  zIndex,
  onFocus,
  onClose,
  className = ''
}: DraggableWindowProps) {
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [size, setSize] = useState<Size>(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevState, setPrevState] = useState<{ position: Position; size: Size } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; initialX: number; initialY: number } | null>(null);
  const resizeStartRef = useRef<{ width: number; height: number; x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start dragging if clicking on the header
    if ((e.target as HTMLElement).closest('.window-header')) {
      onFocus();
      
      if (isMaximized) return;
      
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialX: position.x,
        initialY: position.y
      };
    }
  }, [position, onFocus, isMaximized]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    setPosition({
      x: dragStartRef.current.initialX + deltaX,
      y: dragStartRef.current.initialY + deltaY
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleMaximize = () => {
    if (isMaximized) {
      if (prevState) {
        setPosition(prevState.position);
        setSize(prevState.size);
      }
      setIsMaximized(false);
      setPrevState(null);
    } else {
      setPrevState({ position, size });
      setPosition({ x: 0, y: 0 });
      setIsMaximized(true);
    }
    onFocus();
  };

  const handleResizeStart = useCallback(() => {
    if (isMaximized) return;
    resizeStartRef.current = {
      width: size.width,
      height: size.height,
      x: position.x,
      y: position.y
    };
    onFocus();
  }, [size, position, isMaximized, onFocus]);

  const handleResize = useCallback((e: any, direction: string, ref: HTMLElement, d: { width: number; height: number }) => {
    if (isMaximized || !resizeStartRef.current) return;

    // Calculate new size
    const newSize = {
      width: resizeStartRef.current.width + d.width,
      height: resizeStartRef.current.height + d.height
    };

    // Calculate position delta based on resize direction
    // When resizing from left/top, we need to move the window position
    let deltaX = 0;
    let deltaY = 0;

    // Normalize direction string to lowercase for comparison
    const dir = direction.toLowerCase();

    // Check for left edge (handles: 'left', 'topLeft', 'bottomLeft', 'top-left', 'bottom-left')
    const isResizingFromLeft = dir === 'left' || dir.includes('left');
    
    // Check for top edge (handles: 'top', 'topLeft', 'topRight', 'top-left', 'top-right')
    const isResizingFromTop = dir === 'top' || dir.includes('top');

    // If resizing from left edge, position moves left when width increases
    if (isResizingFromLeft) {
      deltaX = -d.width; // Negative because position.x decreases when dragging left
    }

    // If resizing from top edge, position moves up when height increases
    if (isResizingFromTop) {
      deltaY = -d.height; // Negative because position.y decreases when dragging up
    }

    const newPosition = {
      x: resizeStartRef.current.x + deltaX,
      y: resizeStartRef.current.y + deltaY
    };

    setSize(newSize);
    setPosition(newPosition);
  }, [isMaximized]);

  return (
    <div
      className={`absolute ${className}`}
      style={{
        left: position.x,
        top: position.y,
        zIndex,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <Resizable
        size={isMaximized ? undefined : size}
        defaultSize={defaultSize}
        minWidth={minWidth}
        minHeight={minHeight}
        enable={isMaximized ? {} : {
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true
        }}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        className={`${isMaximized ? 'fixed inset-0 !w-full !h-full' : ''}`}
      >
        <div 
          className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-card flex flex-col"
          onMouseDown={onFocus}
        >
          {/* Window Header */}
          <div 
            className="window-header flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border/50 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 mr-2">
                <button 
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center group"
                >
                  <X className="w-2 h-2 text-white opacity-0 group-hover:opacity-100" />
                </button>
                <button 
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex items-center justify-center group"
                >
                  <Minus className="w-2 h-2 text-white opacity-0 group-hover:opacity-100" />
                </button>
                <button 
                  onClick={toggleMaximize}
                  className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center group"
                >
                  <Square className="w-2 h-2 text-white opacity-0 group-hover:opacity-100" />
                </button>
              </div>
              <GripVertical className="w-4 h-4 text-muted-foreground/50" />
              <span className="text-xs font-medium text-muted-foreground">{title}</span>
            </div>
            <div className="w-16" />
          </div>

          {/* Window Content */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </Resizable>
    </div>
  );
}
