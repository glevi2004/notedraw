# Notedraw

A unified workspace combining Excalidraw-style drawing capabilities with Notion-like notes functionality.

## Monorepo Structure

This is a monorepo managed with [pnpm](https://pnpm.io/) and [Turbo](https://turbo.build/).

```
notedraw/
├── apps/
│   └── web/          # Next.js web application
├── packages/         # Shared packages (empty for now)
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

- **web** - Next.js application with Clerk authentication and subdomain routing

### Packages

- (None yet - shared packages will go here)

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Authentication**: Clerk
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **Build System**: Turbo
- **TypeScript**: Yes

## Development Workflow

1. Make changes in `apps/web/` or `packages/`
2. Turbo will automatically detect changes and rebuild affected packages
3. Use `pnpm dev` to start development servers
4. Use `pnpm build` to test production builds

## Project Status

**Status**: In Development

See [PLAN.md](./PLAN.md) for detailed development plan and roadmap.
See [apps/web/docs/WORKSPACE_REFACTOR.md](./apps/web/docs/WORKSPACE_REFACTOR.md) for workspace + settings architecture and regression checks.
# notedraw
