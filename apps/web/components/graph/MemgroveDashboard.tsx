'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Map } from 'lucide-react';
import { ObsidianGraph } from '@/components/graph/ObsidianGraph';
import { mockGraphData } from '@/data/mock-graph-data';

interface MemgroveDashboardProps {
  showBackButton?: boolean;
  fullScreen?: boolean;
}

export default function MemgroveDashboard({
  showBackButton = false,
  fullScreen = false,
}: MemgroveDashboardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [legendData, setLegendData] = useState<Array<{ tag: string; color: string }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate responsive sizes based on container width
  const baseFontSize = Math.max(10, Math.min(12, containerWidth * 0.033));
  const iconSize = Math.max(12, Math.min(16, containerWidth * 0.044));
  const dotSize = Math.max(10, Math.min(12, containerWidth * 0.033));
  const padding = Math.max(8, Math.min(16, containerWidth * 0.044));

  return (
    <div 
      ref={containerRef}
      className={fullScreen ? 'relative h-screen w-full' : 'relative w-full h-full'}
    >
      <ObsidianGraph graphData={mockGraphData} onLegendData={setLegendData} />

      {/* Back to home button (optional) */}
      {showBackButton && (
        <Link
          href="/"
          className={`group absolute left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2.5 text-sm font-medium text-foreground backdrop-blur-md shadow-sm transition-all duration-500 hover:bg-background hover:border-border/80 ${
            isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'
          }`}
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span className="text-sm font-medium">Back to home</span>
        </Link>
      )}

      {/* Legend - Map of the Garden */}
      {legendData.length > 0 && (
        <div
          className={`absolute bottom-2 right-2 z-50 w-auto max-w-[140px] rounded-lg border border-border bg-background/90 backdrop-blur-md shadow-sm transition-all duration-500 pointer-events-auto ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 pointer-events-none'
          }`}
          style={{
            padding: `${Math.max(6, Math.min(10, padding * 0.7))}px`,
            fontSize: `${baseFontSize}px`,
          }}
        >
          <div className="mb-1.5 flex items-center gap-1">
            <Map 
              className="text-muted-foreground shrink-0" 
              style={{ 
                width: `${Math.max(10, Math.min(12, iconSize * 0.75))}px`,
                height: `${Math.max(10, Math.min(12, iconSize * 0.75))}px`,
              }} 
            />
            <h3 className="font-semibold text-foreground truncate text-[10px] leading-tight">Map</h3>
          </div>
          <div className="space-y-0.5">
            {legendData.map((item) => (
              <div 
                key={item.tag} 
                className="flex items-center gap-1.5 text-muted-foreground"
              >
                <div
                  className="shrink-0 rounded-full"
                  style={{
                    width: `${Math.max(6, Math.min(8, dotSize * 0.7))}px`,
                    height: `${Math.max(6, Math.min(8, dotSize * 0.7))}px`,
                    backgroundColor: item.color,
                    boxShadow: `0 0 0 1px ${item.color}`,
                  }}
                />
                <span className="capitalize truncate text-[10px] leading-tight">{item.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

