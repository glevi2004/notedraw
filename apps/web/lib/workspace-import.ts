import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import type { WorkspaceExportData } from "@/lib/workspace-export";

type CollectionRow = WorkspaceExportData["collections"][number];

/**
 * Topologically sort collections so that parent collections are always
 * created before their children (handles nested collection hierarchies).
 */
function topoSortCollections(collections: CollectionRow[]): CollectionRow[] {
  const sorted: CollectionRow[] = [];
  const remaining = [...collections];
  const added = new Set<string>();

  let changed = true;
  while (remaining.length > 0 && changed) {
    changed = false;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const col = remaining[i];
      if (!col.parentId || added.has(col.parentId)) {
        sorted.push(col);
        added.add(col.id);
        remaining.splice(i, 1);
        changed = true;
      }
    }
  }

  // Any remaining collections have unresolvable parent refs — import at root
  for (const col of remaining) {
    sorted.push({ ...col, parentId: null });
  }

  return sorted;
}

/**
 * Runs a workspace import job asynchronously (called via Next.js after()).
 * Parses the exported JSON, re-creates collections and scenes in the target
 * workspace, and updates the job record to SUCCEEDED or FAILED.
 */
export async function runImportJob(
  jobId: string,
  workspaceId: string,
  requestedById: string,
  exportData: WorkspaceExportData,
): Promise<void> {
  await db.workspaceImportJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  let collectionsCreated = 0;
  let scenesCreated = 0;

  try {
    // Map old collection IDs → newly created IDs
    const collectionIdMap = new Map<string, string>();

    const sortedCollections = topoSortCollections(exportData.collections);
    for (const col of sortedCollections) {
      const newParentId = col.parentId
        ? (collectionIdMap.get(col.parentId) ?? null)
        : null;
      const created = await db.collection.create({
        data: {
          workspaceId,
          name: col.name,
          description: col.description ?? null,
          parentId: newParentId,
          order: col.order,
        },
      });
      collectionIdMap.set(col.id, created.id);
      collectionsCreated++;
    }

    for (const scene of exportData.scenes) {
      const newCollectionId = scene.collectionId
        ? (collectionIdMap.get(scene.collectionId) ?? null)
        : null;
      await db.scene.create({
        data: {
          workspaceId,
          collectionId: newCollectionId,
          title: scene.title,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: (scene.content as any) ?? undefined,
          createdById: requestedById,
        },
      });
      scenesCreated++;
    }

    await db.workspaceImportJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        summary: { collectionsCreated, scenesCreated },
      },
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { jobId, type: "workspace-import" } });
    const errorMessage =
      err instanceof Error ? err.message : "Import failed unexpectedly";
    await db.workspaceImportJob
      .update({
        where: { id: jobId },
        data: { status: "FAILED", completedAt: new Date(), errorMessage },
      })
      .catch(() => {});
  }
}
