import { NextRequest, NextResponse } from "next/server";
import {
  canAccessCollection,
  canAccessWorkspace,
  canAdminWorkspace,
  canEditCollection,
  getCurrentUser,
} from "@/lib/auth";
import { db } from "@/lib/db";

async function getWorkspaceIfAccessible(userId: string, id: string) {
  const allowed = await canAccessWorkspace(userId, id);
  if (!allowed) return null;
  return db.workspace.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              imageUrl: true,
              email: true,
            },
          },
        },
      },
      collections: {
        where: { parentId: null },
        orderBy: { order: "asc" },
      },
      scenes: {
        where: { collectionId: null },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          members: true,
          collections: true,
          scenes: true,
        },
      },
    },
  });
}

async function getCollectionIfAccessible(userId: string, id: string) {
  const allowed = await canAccessCollection(userId, id);
  if (!allowed) return null;
  return db.collection.findUnique({
    where: { id },
    include: {
      children: {
        orderBy: { order: "asc" },
      },
      scenes: {
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          children: true,
          scenes: true,
        },
      },
    },
  });
}

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

    const workspace = await getWorkspaceIfAccessible(user.id, id);
    if (workspace) {
      return NextResponse.json({
        id: workspace.id,
        name: workspace.name,
        members: workspace.members,
        subfolders: workspace.collections,
        scenes: workspace.scenes,
        _count: {
          subfolders: workspace._count.collections,
          scenes: workspace._count.scenes,
        },
      });
    }

    const collection = await getCollectionIfAccessible(user.id, id);
    if (!collection) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      parentFolderId: collection.parentId,
      subfolders: collection.children,
      scenes: collection.scenes,
      _count: {
        subfolders: collection._count.children,
        scenes: collection._count.scenes,
      },
    });
  } catch (error) {
    console.error("Error fetching folder:", error);
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

    const body = await req.json();
    const { name, description } = body as {
      name?: string;
      description?: string | null;
    };

    if (await canAdminWorkspace(user.id, id)) {
      const workspace = await db.workspace.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
        },
      });
      return NextResponse.json(workspace);
    }

    const canEdit = await canEditCollection(user.id, id);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const collection = await db.collection.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
      },
    });

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      parentFolderId: collection.parentId,
    });
  } catch (error) {
    console.error("Error updating folder:", error);
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

    if (await canAdminWorkspace(user.id, id)) {
      await db.workspace.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const canEdit = await canEditCollection(user.id, id);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    await db.collection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
