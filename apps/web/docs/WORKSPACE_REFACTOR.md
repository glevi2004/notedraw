# Workspace Refactor Notes

## Data Model

The app now uses workspace-scoped entities:

- `Workspace` with members, teams, collections, scenes, invites, logs, and import/export jobs
- `WorkspaceMember` roles: `VIEWER`, `MEMBER`, `ADMIN`
- `Collection` hierarchy via `parentId`
- `Scene` scoped by `workspaceId` + optional `collectionId`
- `Team`, `TeamMember`, `TeamCollection` for collection access scoping
- `WorkspaceInvitation`, `WorkspaceActivityLog`, `WorkspaceExportJob`, `WorkspaceImportJob`
- `UserPreference` for account-level settings (theme)
- `CollabRoom` and `ShareSnapshot` remain scene-scoped

## Settings Route Tree

- `/settings/workspace/settings`
- `/settings/workspace/members`
- `/settings/workspace/teams-collections`
- `/settings/workspace/export`
- `/settings/workspace/import`
- `/settings/workspace/logs`
- `/settings/workspace/ai`
- `/settings/subscription/billing`
- `/settings/subscription/manage-subscription`
- `/settings/account/profile`
- `/settings/account/preferences`

`/settings` redirects to the active workspace settings page.

## Invite and Join Flow

1. Admin creates invitation in workspace members settings.
2. API returns an invite link (`/invite/[token]`).
3. Invitee opens `/invite/[token]`, the app calls:
   - `POST /api/workspace-invitations/[token]/accept`
4. On success, user is redirected to:
   - `/dashboard?workspaceId=<joinedWorkspaceId>`

## Regression Verification Commands

Run from repository root:

```bash
rg -n "folderId|parentFolderId|/api/folders|FolderMember" apps/web --glob '!**/generated/**'
pnpm --filter @grovebox/web exec next typegen
pnpm --filter @grovebox/web typecheck
pnpm --filter @grovebox/web test
```

Notes:

- The folder-model grep should return no matches in `apps/web`.
- `typecheck` currently reports pre-existing errors outside this refactor scope.
- `test` validates app-specific regressions and currently passes.

## Seed Data

Use the workspace seed to bootstrap local development:

```bash
pnpm --filter @grovebox/web db:seed
```

Seed creates:

- multiple users with role diversity (`ADMIN`, `MEMBER`, `VIEWER`)
- two workspaces to validate switch behavior
- collections, scenes, team-to-collection mapping
- pending invitation token for join-flow testing
- activity log entries and import/export job samples
