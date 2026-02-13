import { NextRequest, NextResponse } from "next/server";
import {
  canAccessCollection,
  canAccessWorkspace,
  canEditWorkspace,
  getCurrentUser,
  resolveActiveWorkspaceId,
} from "@/lib/auth";
import { db } from "@/lib/db";

// Legacy compatibility route:
// - top-level requests return workspaces
// - nested requests map to collections
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const parentFolderId = searchParams.get("parentFolderId");
    const requestedWorkspaceId = searchParams.get("workspaceId");

    const trimmedParent = parentFolderId?.trim();
    if (!trimmedParent) {
      const workspaces = await db.workspace.findMany({
        where: {
          members: { some: { userId: user.id } },
        },
        include: {
          _count: {
            select: {
              collections: true,
              scenes: true,
              members: true,
            },
          },
          members: {
            where: { userId: user.id },
            select: { role: true },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      return NextResponse.json(
        workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          description: null,
          role: workspace.members[0]?.role ?? null,
          _count: workspace._count,
        })),
      );
    }

    const canAccessParent = await canAccessCollection(user.id, trimmedParent);
    if (!canAccessParent) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const parent = await db.collection.findUnique({
      where: { id: trimmedParent },
      select: { workspaceId: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const workspaceId = requestedWorkspaceId || parent.workspaceId;
    const allowedWorkspace = await canAccessWorkspace(user.id, workspaceId);
    if (!allowedWorkspace) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const collections = await db.collection.findMany({
      where: {
        workspaceId,
        parentId: trimmedParent,
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

    return NextResponse.json(
      collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        parentFolderId: collection.parentId,
        order: collection.order,
        _count: {
          subfolders: collection._count.children,
          scenes: collection._count.scenes,
        },
      })),
    );
  } catch (error) {
    console.error("Error fetching folders:", error);
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
      name,
      description,
      parentFolderId,
      workspaceId: requestedWorkspaceId,
      kind,
    } = body as {
      name?: string;
      description?: string | null;
      parentFolderId?: string | null;
      workspaceId?: string | null;
      kind?: "workspace" | "collection";
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const trimmedParent = parentFolderId?.trim() || null;
    const shouldCreateWorkspace = kind === "workspace" || (!trimmedParent && !requestedWorkspaceId);

    if (shouldCreateWorkspace) {
      const workspace = await db.workspace.create({
        data: {
          name: name.trim(),
          createdById: user.id,
          members: {
            create: {
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
      });

      return NextResponse.json(workspace, { status: 201 });
    }

    let workspaceId = requestedWorkspaceId || null;
    if (trimmedParent) {
      const parent = await db.collection.findUnique({
        where: { id: trimmedParent },
        select: { workspaceId: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent not found" }, { status: 404 });
      }
      workspaceId = parent.workspaceId;
      const canAccessParent = await canAccessCollection(user.id, trimmedParent);
      if (!canAccessParent) {
        return NextResponse.json({ error: "Access denied to parent collection" }, { status: 403 });
      }
    }

    if (!workspaceId) {
      workspaceId = await resolveActiveWorkspaceId(user.id, null);
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace required" }, { status: 400 });
    }

    const canEdit = await canEditWorkspace(user.id, workspaceId);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const maxOrder = await db.collection.findFirst({
      where: {
        workspaceId,
        parentId: trimmedParent,
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
        name: name.trim(),
        description: description || null,
        parentId: trimmedParent,
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

    return NextResponse.json(
      {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        parentFolderId: collection.parentId,
        order: collection.order,
        _count: {
          subfolders: collection._count.children,
          scenes: collection._count.scenes,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
