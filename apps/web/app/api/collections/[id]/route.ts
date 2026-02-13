import { NextRequest, NextResponse } from "next/server";
import {
  canAccessCollection,
  canEditCollection,
  getCurrentUser,
} from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await canAccessCollection(user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const collection = await db.collection.findUnique({
      where: { id },
      include: {
        children: {
          orderBy: { order: "asc" },
        },
        scenes: {
          orderBy: { updatedAt: "desc" },
        },
        teamLinks: {
          include: {
            team: true,
          },
        },
        _count: {
          select: {
            children: true,
            scenes: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Error fetching collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canEdit = await canEditCollection(user.id, id);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      parentId,
    } = body as {
      name?: string;
      description?: string | null;
      parentId?: string | null;
    };

    const updateData: {
      name?: string;
      description?: string | null;
      parentId?: string | null;
    } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description || null;
    }
    if (parentId !== undefined) {
      updateData.parentId = parentId || null;
    }

    const collection = await db.collection.update({
      where: { id },
      data: updateData,
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: collection.workspaceId,
        actorUserId: user.id,
        action: "collection.update",
        entityType: "collection",
        entityId: collection.id,
        metadata: updateData,
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Error updating collection:", error);
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

    const canEdit = await canEditCollection(user.id, id);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const collection = await db.collection.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    await db.collection.delete({
      where: { id },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: collection.workspaceId,
        actorUserId: user.id,
        action: "collection.delete",
        entityType: "collection",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
