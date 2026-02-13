import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { canAdminWorkspace, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  const fromMime = file.type.split("/")[1];
  if (fromMime) return fromMime;

  return "png";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canAdmin = await canAdminWorkspace(user.id, id);
    if (!canAdmin) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Logo must be an image" }, { status: 400 });
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Logo must be 5MB or smaller" },
        { status: 400 },
      );
    }

    const ext = getFileExtension(file);
    const pathname = `workspaces/${id}/logo-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: file.type || "application/octet-stream",
      allowOverwrite: true,
    });

    const workspace = await db.workspace.update({
      where: { id },
      data: {
        logoUrl: blob.url,
      },
      select: {
        id: true,
        logoUrl: true,
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "workspace.logo.upload",
        entityType: "workspace",
        entityId: id,
        metadata: {
          logoUrl: blob.url,
          contentType: file.type,
          size: file.size,
        },
      },
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Error uploading workspace logo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canAdmin = await canAdminWorkspace(user.id, id);
    if (!canAdmin) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const workspace = await db.workspace.update({
      where: { id },
      data: { logoUrl: null },
      select: {
        id: true,
        logoUrl: true,
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "workspace.logo.remove",
        entityType: "workspace",
        entityId: id,
      },
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Error removing workspace logo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
