import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import {
  canAccessWorkspace,
  canAdminWorkspace,
  getCurrentUser,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { runExportJob } from "@/lib/workspace-export";
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

    const jobs = await db.workspaceExportJob.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching export jobs:", error);
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

    const body = await req.json().catch(() => ({}));
    const { scope } = body as { scope?: string };

    const job = await db.workspaceExportJob.create({
      data: {
        workspaceId: id,
        requestedById: user.id,
        scope: scope || "workspace",
        status: "PENDING",
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "workspace.export.requested",
        entityType: "workspace_export_job",
        entityId: job.id,
        metadata: { scope: job.scope },
      },
    });

    // Kick off the actual export after the response is sent so the client
    // receives the job ID immediately and can poll for status.
    after(async () => {
      await runExportJob(job.id);
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Error creating export job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
