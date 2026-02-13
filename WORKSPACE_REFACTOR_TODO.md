# Workspace Refactor TODO

Status: In Progress

## Phase 0 - Tracking and Scope Lock

- [x] Freeze target scope (workspace-centric model + settings + keep collab/share)
- [x] Write phased implementation plan in repository
- [x] Keep this checklist updated as each task is completed

## Phase 1 - Prisma Schema Foundation

- [x] Replace `Folder` / `FolderMember` with `Collection` / `WorkspaceMember`
- [x] Add `Workspace`, `Team`, `TeamMember`, `TeamCollection`
- [x] Move `Scene` ownership to `workspaceId` + optional `collectionId`
- [x] Keep `CollabRoom` and `ShareSnapshot` scene-scoped
- [x] Add settings-related models and fields:
- [x] `Workspace.logoUrl`, `Workspace.aiEnabled`, `Workspace.slug`
- [x] `WorkspaceInvitation`
- [x] `WorkspaceActivityLog`
- [x] `WorkspaceExportJob`
- [x] `WorkspaceImportJob`
- [x] `UserPreference`
- [x] Regenerate Prisma client

## Phase 2 - Auth and Permission Layer

- [x] Add workspace role checks (`VIEWER`, `MEMBER`, `ADMIN`)
- [x] Add collection/team-scoped access evaluation helpers
- [x] Bootstrap default workspace on first user creation
- [x] Ensure webhook flow also creates default workspace + admin membership
- [x] Add reusable guard helpers for settings/account routes

## Phase 3 - API Refactor (Data and Access)

- [x] Introduce `/api/workspaces` CRUD
- [x] Introduce `/api/collections` CRUD
- [x] Refactor `/api/scenes` and `/api/scenes/[id]` to require workspace scope
- [x] Add invites API (create/list/accept/update/remove)
- [x] Add teams API (team CRUD, team members, team-collection links)
- [x] Update collab/share route guards to workspace permission checks
- [x] Add activity logging writes for workspace mutations

## Phase 4 - Dashboard Navigation Refactor

- [x] Move user profile block to sidebar footer
- [x] Add workspace switcher component at top of sidebar
- [x] Add workspace switcher dropdown actions:
- [x] Workspace settings, Team members, Billing, User account
- [x] Add workspace listing + create workspace in dropdown
- [x] Persist selected workspace (`workspaceId`) via URL + local storage/cookie
- [x] Replace folder terminology in dashboard UI with collection terminology

## Phase 5 - Settings Shell and Routing

- [x] Add `app/settings/layout.tsx` with grouped left navigation
- [x] Add `/settings` redirect to active workspace settings page
- [x] Add workspace section routes:
- [x] `/settings/workspace/settings`
- [x] `/settings/workspace/members`
- [x] `/settings/workspace/teams-collections`
- [x] `/settings/workspace/export`
- [x] `/settings/workspace/import`
- [x] `/settings/workspace/logs`
- [x] `/settings/workspace/ai`
- [x] Add subscription section routes:
- [x] `/settings/subscription/billing`
- [x] `/settings/subscription/manage-subscription`
- [x] Add account section routes:
- [x] `/settings/account/profile`
- [x] `/settings/account/preferences`

## Phase 6 - Settings Features (Workspace)

- [x] Workspace settings page: logo and rename
- [x] Members page: pending invitations + member list + invite flow
- [x] Teams & collections page: create/manage teams and assignments
- [x] AI page: admin toggle for workspace AI

## Phase 7 - Settings Features (Jobs, Billing Placeholder, Account)

- [x] Workspace export jobs (trigger + status/history)
- [x] Workspace import jobs (upload + status/history)
- [x] Logs page filters and event table
- [x] Billing page placeholder ("coming soon")
- [x] Manage Subscription page placeholder ("coming soon")
- [x] Profile page (avatar/name/email/linked accounts/signout/delete entry)
- [x] Preferences page (theme and account-level preferences)

## Phase 8 - Regression and Cleanup

- [x] Remove remaining `Folder`/`FolderMember` references in app-facing code
- [x] Verify role-based permissions across API and UI
- [x] Verify multi-workspace switch flow
- [x] Verify invite-and-join flow
- [x] Verify collab/share still function under workspace permissions
- [x] Run typecheck and relevant tests
- [x] Update docs and seed/fixtures

## Completion Criteria

- [x] No folder-based ownership/sharing model remains in app-facing logic
- [x] Users can own and switch multiple workspaces
- [x] Users can join invited workspaces while keeping existing ones
- [x] Role and team/collection access is enforced end-to-end
- [x] Full `/settings` tree exists and is wired

## Validation Notes

- Ran `pnpm --filter @grovebox/web exec next typegen` to refresh route types after cleanup.
- Ran `pnpm --filter @grovebox/web typecheck`; command executes but workspace has pre-existing type errors outside this refactor scope.
- Ran `pnpm --filter @grovebox/web test`; current workspace test suite passes.
