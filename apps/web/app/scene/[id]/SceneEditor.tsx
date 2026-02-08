'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useTheme } from '@/context/ThemeContext'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import '@excalidraw/excalidraw/index.css'

interface SceneEditorProps {
  sceneId: string
  title: string
  initialContent: unknown // Prisma Json type
}

// Simple debounce hook
function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

export function SceneEditor({ sceneId, title, initialContent }: SceneEditorProps) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const { theme } = useTheme()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Parse initial content
  const initialData = useCallback(() => {
    if (!initialContent) return null
    
    try {
      // Handle both Excalidraw format and legacy notedraw format
      const content = initialContent as any
      
      // If it's already in Excalidraw format (has elements and appState)
      if (content.elements && content.appState) {
        return {
          elements: content.elements,
          appState: content.appState,
        }
      }
      
      // Legacy notedraw format - migrate to Excalidraw format
      if (content.elements) {
        return {
          elements: migrateElements(content.elements),
          appState: migrateAppState(content.appState),
        }
      }
      
      return null
    } catch (err) {
      console.error('Error parsing initial content:', err)
      return null
    }
  }, [initialContent])

  // Auto-save with debounce (save 2s after last change)
  const saveContent = useDebouncedCallback(async () => {
    if (!excalidrawRef.current) return

    setIsSaving(true)
    setSaveError(null)
    
    try {
      const elements = excalidrawRef.current.getSceneElements()
      const appState = excalidrawRef.current.getAppState()
      
      // Serialize to JSON for storage
      const files = excalidrawRef.current.getFiles()
      const serialized = serializeAsJSON(elements, appState, files, 'database')
      const content = JSON.parse(serialized)
      
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to save scene')
      }

      setLastSaved(new Date())
    } catch (err) {
      console.error('Error saving scene:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, 2000)

  const handleChange = useCallback(() => {
    saveContent()
  }, [saveContent])

  // Handle beforeunload to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isSaving])

  // Mark loading as complete after initial render
  useEffect(() => {
    setIsLoading(false)
  }, [])

  const handleBack = () => {
    router.push('/dashboard')
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <span className="text-sm font-medium truncate max-w-[300px]">
            {title}
          </span>
        </div>

        {/* Save Status */}
        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-xs text-destructive">
              Save failed: {saveError}
            </span>
          )}
          {isSaving && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </div>
          )}
          {!isSaving && lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Spacer for alignment */}
        <div className="w-20" />
      </header>

      {/* Editor */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="w-full h-full">
            <Excalidraw
              excalidrawAPI={(api) => {
                excalidrawRef.current = api
              }}
              initialData={initialData()}
              onChange={handleChange}
              theme={theme === 'dark' ? 'dark' : 'light'}
              gridModeEnabled={false}
              UIOptions={{
                canvasActions: {
                  changeViewBackgroundColor: true,
                  clearCanvas: true,
                  export: { saveFileToDisk: true },
                  loadScene: true,
                  saveToActiveFile: false,
                  toggleTheme: false,
                  saveAsImage: true,
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Migration functions from notedraw format to Excalidraw format
function migrateElements(elements: any[]): any[] {
  if (!Array.isArray(elements)) return []
  
  return elements.map((el: any) => {
    // Map notedraw element types to Excalidraw types
    const typeMap: Record<string, string> = {
      'rectangle': 'rectangle',
      'ellipse': 'ellipse',
      'diamond': 'diamond',
      'line': 'line',
      'arrow': 'arrow',
      'freedraw': 'freedraw',
      'text': 'text',
      'image': 'image',
    }
    
    const type = typeMap[el.type] || 'rectangle'
    
    // Base element properties
    const migrated: any = {
      id: el.id || generateId(),
      type,
      x: el.x || 0,
      y: el.y || 0,
      width: el.width || 100,
      height: el.height || 100,
      angle: el.angle || 0,
      strokeColor: el.strokeColor || '#1e1e1e',
      backgroundColor: el.backgroundColor || 'transparent',
      fillStyle: el.fillStyle || 'solid',
      strokeWidth: el.strokeWidth || 2,
      strokeStyle: el.strokeStyle || 'solid',
      roughness: el.roughness ?? 1,
      opacity: el.opacity ?? 100,
      groupIds: el.groupIds || [],
      frameId: el.frameId || null,
      boundElements: el.boundElements || [],
      updated: el.updated || Date.now(),
      version: el.version || 1,
      versionNonce: el.versionNonce || Date.now(),
      isDeleted: el.isDeleted || false,
      seed: el.seed || Math.floor(Math.random() * 100000),
      roundness: el.roundness || null,
    }
    
    // Type-specific properties
    if (type === 'line' || type === 'arrow') {
      migrated.points = el.points || [[0, 0], [100, 0]]
      migrated.startBinding = el.startBinding || null
      migrated.endBinding = el.endBinding || null
      migrated.startArrowhead = el.startArrowhead || null
      migrated.endArrowhead = el.endArrowhead || (type === 'arrow' ? 'arrow' : null)
      migrated.elbowed = el.elbowed || false
      migrated.fixedSegments = el.fixedSegments || null
    }
    
    if (type === 'text') {
      migrated.text = el.text || ''
      migrated.fontSize = el.fontSize || 20
      migrated.fontFamily = el.fontFamily || 1 // Excalidraw font family value
      migrated.textAlign = el.textAlign || 'left'
      migrated.verticalAlign = el.verticalAlign || 'top'
      migrated.containerId = el.containerId || null
      migrated.originalText = el.originalText || el.text || ''
      migrated.lineHeight = el.lineHeight || 1.25
    }
    
    if (type === 'freedraw') {
      migrated.points = el.points || []
      migrated.simulatePressure = el.simulatePressure ?? true
      migrated.pressures = el.pressures || []
    }
    
    if (type === 'image') {
      migrated.fileId = el.fileId || null
      migrated.scale = el.scale || [1, 1]
      migrated.status = el.status || 'saved'
    }
    
    return migrated
  })
}

function migrateAppState(appState: any): any {
  if (!appState) return getDefaultAppState()
  
  return {
    ...getDefaultAppState(),
    theme: appState.theme || 'light',
    viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
    zoom: appState.zoom || { value: 1 },
    scrollX: appState.scroll?.scrollX || 0,
    scrollY: appState.scroll?.scrollY || 0,
    gridSize: appState.gridSize || null,
    gridModeEnabled: appState.showGrid || false,
    selectedElementIds: appState.selectedElementIds || {},
    editingElementId: appState.editingElementId || null,
    currentStrokeColor: appState.currentStrokeColor || '#1e1e1e',
    currentBackgroundColor: appState.currentBackgroundColor || 'transparent',
    currentFillStyle: appState.currentFillStyle || 'solid',
    currentStrokeWidth: appState.currentStrokeWidth || 2,
    currentStrokeStyle: appState.currentStrokeStyle || 'solid',
    currentRoughness: appState.currentRoughness || 1,
    currentOpacity: appState.currentOpacity ?? 100,
    currentFontSize: appState.currentFontSize || 20,
    currentFontFamily: appState.currentFontFamily || 1,
  }
}

function getDefaultAppState(): any {
  return {
    theme: 'light',
    viewBackgroundColor: '#ffffff',
    zoom: { value: 1 },
    scrollX: 0,
    scrollY: 0,
    gridSize: null,
    gridModeEnabled: false,
    selectedElementIds: {},
    selectedGroupIds: {},
    editingElementId: null,
    currentStrokeColor: '#1e1e1e',
    currentBackgroundColor: 'transparent',
    currentFillStyle: 'solid',
    currentStrokeWidth: 2,
    currentStrokeStyle: 'solid',
    currentRoughness: 1,
    currentOpacity: 100,
    currentFontSize: 20,
    currentFontFamily: 1,
    currentTextAlign: 'left',
    currentStartArrowhead: null,
    currentEndArrowhead: 'arrow',
    name: '',
    collaborators: new Map(),
    activeTool: {
      type: 'selection',
      customType: null,
      locked: false,
    },
    penMode: false,
    penDetected: false,
    exportBackground: true,
    exportScale: 1,
    exportEmbedScene: false,
    exportWithDarkMode: false,
    openMenu: null,
    openPopup: null,
    openSidebar: null,
    openDialog: null,
    pasteDialog: { shown: false, data: null },
    previousSelectedElementIds: {},
    shouldCacheIgnoreZoom: false,
    zenModeEnabled: false,
    toast: null,
    editingGroupId: null,
    selectionElement: null,
    isBindingEnabled: true,
    startBoundElement: null,
    suggestedBinding: null,
    stats: { open: false, panels: 0 },
    frameRendering: { enabled: true, clip: true, name: true, outline: true },
    objectsSnapModeEnabled: false,
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
