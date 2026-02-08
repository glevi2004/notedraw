'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GraphData } from '@/data/mock-graph-data';
import { useTheme } from '@/context/ThemeContext';

// Dynamically import to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then((mod) => mod.default), {
  ssr: false,
}) as any;

interface GraphNode {
  id: string;
  label: string;
  tags: string[];
  color: string;
  path: string;
}

interface GraphLink {
  source: string;
  target: string;
}

interface ObsidianGraphProps {
  graphData: GraphData;
  onLegendData?: (legend: Array<{ tag: string; color: string }>) => void;
}

export function ObsidianGraph({ graphData, onLegendData }: ObsidianGraphProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    if (graphData.legend && onLegendData) {
      onLegendData(graphData.legend);
    }
  }, [graphData.legend, onLegendData]);

  // Resize observer to update graph dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Helper function to mute/desaturate colors
  const muteColor = (hex: string): string => {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Desaturate by mixing with gray (40% gray, 60% original)
    const mutedR = Math.round(r * 0.6 + 200 * 0.4);
    const mutedG = Math.round(g * 0.6 + 200 * 0.4);
    const mutedB = Math.round(b * 0.6 + 200 * 0.4);
    
    // Add slight transparency for softer appearance
    return `rgba(${mutedR}, ${mutedG}, ${mutedB}, 0.75)`;
  };

  const handleContainerInteraction = () => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      // Trigger zoom after user interaction
      setTimeout(() => {
        if (graphRef.current && graphRef.current.zoomToFit) {
          graphRef.current.zoomToFit(400, 30);
        }
      }, 100);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`h-full w-full ${isDark ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]'}`}
      onMouseDown={handleContainerInteraction}
      onTouchStart={handleContainerInteraction}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => {
            const graphNode = node as GraphNode;
            return `${graphNode.label}${graphNode.tags.length > 0 ? `\nTags: ${graphNode.tags.join(', ')}` : ''}`;
          }}
          nodeColor={(node: any) => muteColor((node as GraphNode).color)}
          nodeVal={(node: any) => {
            // Smaller, more uniform node sizes for minimalist look
            const graphNode = node as GraphNode;
            const linkCount = graphData.links.filter(
              (link) => link.source === graphNode.id || link.target === graphNode.id
            ).length;
            return Math.max(2.5, Math.min(5, 3 + linkCount * 0.2));
          }}
          linkColor={() =>
            isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.3)'
          }
          linkWidth={0.8}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.05}
          cooldownTicks={150}
          onEngineStop={() => {
            // Don't auto-zoom on engine stop - only zoom on user interaction
          }}
          onNodeClick={() => {
            setHasUserInteracted(true);
            if (graphRef.current && graphRef.current.zoomToFit) {
              setTimeout(() => {
                graphRef.current.zoomToFit(400, 30);
              }, 100);
            }
          }}
          onBackgroundClick={() => {
            setHasUserInteracted(true);
            if (graphRef.current && graphRef.current.zoomToFit) {
              setTimeout(() => {
                graphRef.current.zoomToFit(400, 30);
              }, 100);
            }
          }}
          d3VelocityDecay={0.3}
          d3AlphaDecay={0.0228}
          backgroundColor={isDark ? '#1e1e1e' : '#fafafa'}
          d3Force={(forceSimulation: any) => {
            // Increase spacing between nodes
            forceSimulation.force('link')?.distance((link: any) => 180);
            forceSimulation.force('charge')?.strength(-400);
            forceSimulation.force('center', null);
          }}
        />
      )}
    </div>
  );
}
