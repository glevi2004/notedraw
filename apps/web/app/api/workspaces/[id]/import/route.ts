import { after, NextRequest, NextResponse } from "next/server";
import {
  canAccessWorkspace,
  canAdminWorkspace,
  getCurrentUser,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { runImportJob } from "@/lib/workspace-import";
import type { WorkspaceExportData } from "@/lib/workspace-export";
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await canAccessWorkspace(user.id, id);
    if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const jobs = await db.workspaceImportJob.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching import jobs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canAdmin = await canAdminWorkspace(user.id, id);
    if (!canAdmin) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    // Accept either multipart/form-data (file upload) or plain JSON
    let exportData: WorkspaceExportData;
    let sourceName: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "Missing file field in form data" },
          { status: 400 },
        );
      }
      sourceName = (form.get("sourceName") as string | null) ?? (file as File).name ?? null;
      const text = await (file as File).text();
      try {
        exportData = JSON.parse(text) as WorkspaceExportData;
      } catch {
        return NextResponse.json({ error: "Invalid JSON in uploaded file" }, { status: 400 });
      }
    } else {
      const body = await req.json().catch(() => ({})) as {
        sourceName?: string;
        data?: WorkspaceExportData;
      };
      sourceName = body.sourceName ?? null;
      if (!body.data) {
        return NextResponse.json(
          { error: "Missing data field. POST multipart/form-data with a file or JSON with a data field." },
          { status: 400 },
        );
      }
      exportData = body.data;
    }

    // Basic format validation
    if (!exportData || exportData.version !== 1 || !Array.isArray(exportData.scenes)) {
      return NextResponse.json(
        { error: "Invalid export format: expected version 1 with scenes array" },
        { status: 422 },
      );
    }

    const job = await db.workspaceImportJob.create({
      data: {
        workspaceId: id,
        requestedById: user.id,
        sourceName: sourceName ?? null,
        status: "PENDING",
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "workspace.import.requested",
        entityType: "workspace_import_job",
        entityId: job.id,
        metadata: {
          sourceName: job.sourceName,
          sceneCount: exportData.scenes.length,
          collectionCount: exportData.collections?.length ?? 0,
        },
      },
    });

    // Run the import processor after the response is sent so the client
    // receives the job ID immediately and can poll for status.
    after(async () => {
      await runImportJob(job.id, id, user.id, exportData);
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Error creating import job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
