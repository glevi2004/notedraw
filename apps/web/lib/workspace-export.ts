import { put } from "@vercel/blob";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";

export type WorkspaceExportData = {
  version: 1;
  exportedAt: string;
  workspace: { id: string; name: string };
  collections: Array<{
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
    order: number;
  }>;
  scenes: Array<{
    id: string;
    title: string;
    content: unknown;
    collectionId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

/**
 * Runs a workspace export job asynchronously (called via Next.js after()).
 * Fetches all scenes and collections, serialises them to JSON, uploads to
 * Vercel Blob, and updates the job record to SUCCEEDED or FAILED.
 */
export async function runExportJob(jobId: string): Promise<void> {
  await db.workspaceExportJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const job = await db.workspaceExportJob.findUnique({
      where: { id: jobId },
    });
    if (!job) return;

    const workspace = await db.workspace.findUnique({
      where: { id: job.workspaceId },
      select: { id: true, name: true },
    });
    if (!workspace) throw new Error("Workspace not found");

    const collections = await db.collection.findMany({
      where: { workspaceId: job.workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        order: true,
      },
      orderBy: { order: "asc" },
    });

    const scenes = await db.scene.findMany({
      where: { workspaceId: job.workspaceId },
      select: {
        id: true,
        title: true,
        content: true,
        collectionId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const exportData: WorkspaceExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace: { id: workspace.id, name: workspace.name },
      collections,
      scenes: scenes.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    };

    const json = JSON.stringify(exportData);
    const filename = `exports/${job.workspaceId}/${jobId}.json`;
    const blob = await put(filename, json, {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    await db.workspaceExportJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        blobPath: blob.url,
      },
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { jobId, type: "workspace-export" } });
    const errorMessage =
      err instanceof Error ? err.message : "Export failed unexpectedly";
    await db.workspaceExportJob
      .update({
        where: { id: jobId },
        data: { status: "FAILED", completedAt: new Date(), errorMessage },
      })
      .catch(() => {});
  }
}
