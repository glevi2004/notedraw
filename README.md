# Notedraw

Workspace combining Excalidraw-style drawing capabilities with Notion-like notes functionality, enhanced with AI-powered features and MCP (Model Context Protocol) integration, so you can just describe the diagram you need in plain english and let AI do the rest.

## Features

### Core Features
- **Excalidraw Drawing**: Full-featured drawing canvas with hand-drawn style elements
- **Notion-like Notes**: Block-based note editor integrated into the canvas
- **Real-time Collaboration**: Live collaborative editing with Socket.IO
- **Workspace & Collections**: Organized workspace structure with collections (formerly folders)
- **Scene Management**: Create, edit, duplicate, and organize drawing scenes
- **Share & Export**: Share scenes via public links and export to various formats

### AI Features
- **Scene AI Chat**: AI-powered assistant that can modify scenes in real-time
  - Add, edit, and delete elements through natural language
  - Create and update note elements from text or markdown
  - Live canvas mutations with scene patch events
  - Workspace-scoped AI with role-based permissions
- **Text-to-Diagram**: Generate diagrams from text descriptions
- **AI Workspace Settings**: Per-workspace AI enable/disable controls

### MCP (Model Context Protocol) Integration
- **MCP App Server**: Standalone MCP server for external AI clients (Claude, ChatGPT, etc.)
  - Interactive Excalidraw diagram preview and editing widgets
  - Checkpoint system for diagram state persistence
  - Export to Excalidraw and Notedraw share formats
  - Streaming diagram rendering with hand-drawn animations
  - Fullscreen editing mode with real-time sync
- **Internal MCP Client**: MCP-powered AI orchestration within the web app
  - Tool execution via MCP protocol
  - Scene patch operations for live canvas updates
  - Permission-aware tool access based on workspace roles

### Collaboration Features
- **Live Collaboration**: Real-time multi-user editing
- **Collaboration Rooms**: Create and join collaboration sessions
- **File Sharing**: Encrypted file uploads for images and assets
- **Cursor Sync**: See other users' cursors and selections in real-time
- **Idle Detection**: Track user activity states (active/idle/away)

## Monorepo Structure

This is a monorepo managed with [pnpm](https://pnpm.io/) and [Turbo](https://turbo.build/).

```
notedraw/
├── apps/
│   ├── web/          # Next.js web application
│   ├── collab/       # Collaboration server (Socket.IO)
│   └── mcp/          # MCP server for AI integrations
├── packages/
│   ├── excalidraw/   # Excalidraw fork with custom features
│   ├── element/      # Element types and rendering
│   ├── common/       # Shared utilities
│   ├── math/         # Math utilities
│   ├── utils/        # Utility functions
│   ├── ai-contracts/ # AI/MCP contracts and schemas
│   └── scene-ops/   # Scene mutation operations
├── package.json      # Root package.json with turbo scripts
├── pnpm-workspace.yaml
└── turbo.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 10.24.0+

### Installation

Install dependencies from the root:

```bash
pnpm install
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

Run a specific app:

```bash
cd apps/web
pnpm dev
```

Seed workspace development data:

```bash
cd apps/web
pnpm db:seed
```

### Building

Build all apps:

```bash
pnpm build
```

### Other Commands

- `pnpm lint` - Lint all packages
- `pnpm typecheck` - Type check all packages
- `pnpm format` - Format code
- `pnpm format:check` - Check code formatting
- `pnpm clean` - Clean build artifacts and node_modules

## Subdomain Routing

The application supports subdomain-based routing:

### Production
- `app.notedraw.com` - Application subdomain (authenticated routes)
- `notedraw.com` - Marketing/public site

### Development
- `app.localhost:3000` - Application subdomain
- `notedraw.local:3000` - Marketing/public site (or `localhost:3000`)

### Local Setup

To use subdomains locally, add to your `/etc/hosts` file:

```
127.0.0.1 app.localhost
127.0.0.1 notedraw.local
```

Then access:
- `http://app.localhost:3000` - App routes
- `http://notedraw.local:3000` - Marketing routes

## Workspace Packages

### Apps

- **web** - Next.js application with Clerk authentication, AI features, and subdomain routing
- **collab** - Socket.IO collaboration server for real-time editing
- **mcp** - MCP (Model Context Protocol) server for AI integrations

### Packages

- **excalidraw** - Forked Excalidraw with custom note element support
- **element** - Element types, rendering, and utilities
- **common** - Shared utilities and constants
- **math** - Math utilities for geometry and calculations
- **utils** - General utility functions
- **ai-contracts** - TypeScript contracts for AI/MCP tool schemas
- **scene-ops** - Scene mutation operations and validation

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Authentication**: Clerk
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **Drawing**: Excalidraw (forked with custom features)
- **Notes**: BlockNote editor
- **State Management**: React hooks and context

### Backend
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **File Storage**: Vercel Blob
- **Real-time**: Socket.IO with Redis adapter
- **API**: Next.js API routes

### AI & MCP
- **MCP Server**: Custom MCP server for AI tool execution
- **AI Orchestration**: Scene chat orchestrator with tool execution
- **Model Integration**: Supports multiple AI providers via MCP

### Infrastructure
- **Package Manager**: pnpm
- **Build System**: Turbo
- **TypeScript**: Full TypeScript support
- **Monorepo**: pnpm workspaces

## Development Workflow

1. Make changes in `apps/web/` or `packages/`
2. Turbo will automatically detect changes and rebuild affected packages
3. Use `pnpm dev` to start development servers
4. Use `pnpm build` to test production builds

## Architecture Highlights

### Scene Saving Strategy
Notedraw uses an optimized scene saving strategy based on Excalidraw's Firebase approach:
- **Scene Version Tracking**: Only saves when element versions change
- **Throttled Saves**: Periodic checkpoints (10 seconds) during active editing
- **Immediate Save on Exit**: Saves instantly when user leaves
- **Version Cache**: Prevents redundant database writes

See [apps/web/docs/SCENE_SAVING.md](./apps/web/docs/SCENE_SAVING.md) for detailed documentation.

### Workspace & Collections
- **Workspaces**: Top-level organization units with member management
- **Collections**: Organize scenes within workspaces (replaces folders)
- **Teams**: Group-based access control within workspaces
- **Roles**: Viewer, Member, and Admin roles with granular permissions

### AI Integration Architecture
- **Internal Mode**: AI chat within Notedraw web app applies live scene patches
- **External Mode**: MCP server provides interactive widgets for external AI clients
- **Tool Execution**: MCP protocol for tool calls with permission enforcement
- **Scene Patches**: Structured operations for adding/editing/deleting elements

See [MCP_EXECUTION_PLAN.md](./MCP_EXECUTION_PLAN.md) for detailed MCP implementation plan.

### Collaboration Architecture
- **CollabController**: Manages collaboration state and Socket.IO connections
- **Portal**: Handles encrypted room communication
- **FileManager**: Manages image uploads and file sharing
- **Real-time Sync**: Element broadcasting with reconciliation

## Environment Variables

### Web App (`apps/web`)
```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# File Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Collaboration
NEXT_PUBLIC_COLLAB_SERVER_URL=wss://...

# AI/MCP
AI_MCP_ENABLED=true
AI_MCP_MUTATIONS_ENABLED=true
```

### MCP Server (`apps/mcp`)
```bash
# Checkpoint Storage (optional, uses memory fallback)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Notedraw Share Export (optional)
NOTEDRAW_SHARE_EXPORT_URL=https://...
NOTEDRAW_SHARE_EXPORT_TOKEN=...
```

### Collab Server (`apps/collab`)
```bash
PORT=4001
COLLAB_REDIS_URL=redis://...
COLLAB_ALLOWED_ORIGINS=https://...
COLLAB_MAX_PAYLOAD_BYTES=1000000
```

## Development

### Running All Services

```bash
# Install dependencies
pnpm install

# Start all services (web, collab, mcp)
pnpm dev

# Or start individually:
cd apps/web && pnpm dev
cd apps/collab && pnpm dev
cd apps/mcp && pnpm dev
```

### Database Setup

```bash
cd apps/web

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed development data
pnpm db:seed

# Open Prisma Studio
pnpm db:studio
```

## Project Status

**Status**: In Development

### Documentation
- [PLAN.md](./PLAN.md) - Detailed development plan and roadmap
- [MCP_EXECUTION_PLAN.md](./MCP_EXECUTION_PLAN.md) - MCP and AI integration plan
- [apps/web/docs/WORKSPACE_REFACTOR.md](./apps/web/docs/WORKSPACE_REFACTOR.md) - Workspace architecture
- [apps/web/docs/SCENE_SAVING.md](./apps/web/docs/SCENE_SAVING.md) - Scene saving strategy
- [apps/mcp/README.md](./apps/mcp/README.md) - MCP server documentation

### Known Issues
- See terminal output for current runtime warnings and errors
- Some dependencies may need workspace linking (`pnpm install`)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `pnpm lint && pnpm typecheck`
5. Submit a pull request

## License

MIT
