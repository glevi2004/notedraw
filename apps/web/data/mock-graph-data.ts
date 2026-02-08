export interface GraphNode {
  id: string;
  label: string;
  tags: string[];
  color: string;
  path: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  legend: Array<{ tag: string; color: string }>;
}

export const mockGraphData: GraphData = {
  nodes: [
    {
      id: 'node-1',
      label: 'Getting Started',
      tags: ['tutorial'],
      color: '#52e0a3',
      path: 'getting-started'
    },
    {
      id: 'node-2',
      label: 'API Reference',
      tags: ['documentation'],
      color: '#83badd',
      path: 'api-reference'
    },
    {
      id: 'node-3',
      label: 'Authentication',
      tags: ['security', 'api'],
      color: '#2d65ae',
      path: 'authentication'
    },
    {
      id: 'node-4',
      label: 'Webhooks',
      tags: ['integration'],
      color: '#05004d',
      path: 'webhooks'
    },
    {
      id: 'node-5',
      label: 'SDK Examples',
      tags: ['tutorial', 'code'],
      color: '#ffda8a',
      path: 'sdk-examples'
    },
    {
      id: 'node-6',
      label: 'Best Practices',
      tags: ['guide'],
      color: '#ffd91a',
      path: 'best-practices'
    },
    {
      id: 'node-7',
      label: 'Error Handling',
      tags: ['guide', 'api'],
      color: '#0b7f28',
      path: 'error-handling'
    },
    {
      id: 'node-8',
      label: 'Rate Limiting',
      tags: ['api', 'security'],
      color: '#2d65ae',
      path: 'rate-limiting'
    },
    {
      id: 'node-9',
      label: 'Quickstart',
      tags: ['tutorial'],
      color: '#52e0a3',
      path: 'quickstart'
    },
    {
      id: 'node-10',
      label: 'Deployment',
      tags: ['guide'],
      color: '#ff7575',
      path: 'deployment'
    },
    {
      id: 'node-11',
      label: 'Testing',
      tags: ['guide', 'code'],
      color: '#0b7f28',
      path: 'testing'
    },
    {
      id: 'node-12',
      label: 'Configuration',
      tags: ['guide'],
      color: '#83badd',
      path: 'configuration'
    }
  ],
  links: [
    { source: 'node-1', target: 'node-9' },
    { source: 'node-1', target: 'node-2' },
    { source: 'node-2', target: 'node-3' },
    { source: 'node-2', target: 'node-4' },
    { source: 'node-2', target: 'node-8' },
    { source: 'node-3', target: 'node-8' },
    { source: 'node-4', target: 'node-5' },
    { source: 'node-5', target: 'node-11' },
    { source: 'node-6', target: 'node-7' },
    { source: 'node-6', target: 'node-10' },
    { source: 'node-7', target: 'node-8' },
    { source: 'node-9', target: 'node-5' },
    { source: 'node-9', target: 'node-12' },
    { source: 'node-10', target: 'node-11' },
    { source: 'node-12', target: 'node-3' }
  ],
  legend: [
    { tag: 'tutorial', color: '#52e0a3' },
    { tag: 'documentation', color: '#83badd' },
    { tag: 'security', color: '#2d65ae' },
    { tag: 'integration', color: '#05004d' },
    { tag: 'code', color: '#ffda8a' },
    { tag: 'guide', color: '#ffd91a' },
    { tag: 'api', color: '#0b7f28' }
  ]
};
