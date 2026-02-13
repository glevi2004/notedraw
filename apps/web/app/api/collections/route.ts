import { NextRequest, NextResponse } from "next/server";
import {
  canAccessWorkspace,
  canEditCollection,
  canEditWorkspace,
  getCurrentUser,
  resolveActiveWorkspaceId,
} from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const parentId = searchParams.get("parentId");

    const workspaceId = await resolveActiveWorkspaceId(user.id, requestedWorkspaceId);
    if (!workspaceId) {
      return NextResponse.json([], { status: 200 });
    }

    const allowed = await canAccessWorkspace(user.id, workspaceId);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const collections = await db.collection.findMany({
      where: {
        workspaceId,
        parentId: parentId || null,
      },
      include: {
        _count: {
          select: {
            children: true,
            scenes: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      workspaceId: requestedWorkspaceId,
      parentId,
      name,
      description,
    } = body as {
      workspaceId?: string;
      parentId?: string | null;
      name?: string;
      description?: string | null;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const workspaceId = await resolveActiveWorkspaceId(
      user.id,
      requestedWorkspaceId,
    );
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace required" }, { status: 400 });
    }

    const canEdit = await canEditWorkspace(user.id, workspaceId);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    if (parentId) {
      const parent = await db.collection.findUnique({
        where: { id: parentId },
        select: { id: true, workspaceId: true },
      });
      if (!parent || parent.workspaceId !== workspaceId) {
        return NextResponse.json({ error: "Parent not found" }, { status: 404 });
      }
      const canEditParent = await canEditCollection(user.id, parentId);
      if (!canEditParent) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }
    }

    const maxOrder = await db.collection.findFirst({
      where: {
        workspaceId,
        parentId: parentId || null,
      },
      orderBy: {
        order: "desc",
      },
      select: {
        order: true,
      },
    });

    const collection = await db.collection.create({
      data: {
        workspaceId,
        parentId: parentId || null,
        name: name.trim(),
        description: description || null,
        order: (maxOrder?.order ?? -1) + 1,
      },
      include: {
        _count: {
          select: {
            children: true,
            scenes: true,
          },
        },
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId,
        actorUserId: user.id,
        action: "collection.create",
        entityType: "collection",
        entityId: collection.id,
        metadata: {
          name: collection.name,
          parentId: collection.parentId,
        },
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
