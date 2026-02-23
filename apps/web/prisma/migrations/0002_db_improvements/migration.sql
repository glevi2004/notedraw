-- ============================================================
-- Migration: 0002_db_improvements
-- Covers plan items 2.2, 2.3, and 2.4
-- ============================================================

-- 2.2 Scene content size tracking
-- Byte length of the serialized content JSON, updated on every save.
-- Allows monitoring large scenes without fetching the full JSONB column.
ALTER TABLE "Scene" ADD COLUMN "contentSize" INTEGER;

-- 2.3 Full-text search index (GIN on tsvector)
-- Replaces the implicit LIKE full-table-scan with a proper GIN-accelerated
-- full-text search over the searchText column.
-- The column is already @db.Text; tsvector operates on it at query time.
-- Backfill: run `pnpm db:backfill-search` after applying this migration.
CREATE INDEX "Scene_searchText_gin_idx"
    ON "Scene"
    USING GIN (to_tsvector('english', COALESCE("searchText", '')));

-- 2.4 Composite indexes for common query patterns

-- Scene: list scenes in a collection ordered by recency
CREATE INDEX "Scene_collectionId_updatedAt_idx" ON "Scene"("collectionId", "updatedAt");

-- CollabRoom: find active (non-revoked) rooms for a scene
CREATE INDEX "CollabRoom_sceneId_revokedAt_idx" ON "CollabRoom"("sceneId", "revokedAt");

-- ShareSnapshot: find active/expired snapshots for a scene (used by cron cleanup)
CREATE INDEX "ShareSnapshot_sceneId_revokedAt_idx" ON "ShareSnapshot"("sceneId", "revokedAt");

-- ShareSnapshot: cron cleanup — find all snapshots past expiresAt
CREATE INDEX "ShareSnapshot_expiresAt_idx" ON "ShareSnapshot"("expiresAt");
