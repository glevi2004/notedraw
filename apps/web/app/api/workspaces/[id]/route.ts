import { NextRequest, NextResponse } from "next/server";
import {
  canAccessWorkspace,
  canAdminWorkspace,
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

    const allowed = await canAccessWorkspace(user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const workspace = await db.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        invitations: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        teams: {
          include: {
            _count: {
              select: {
                members: true,
                collections: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        },
        collections: {
          where: { parentId: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: {
            members: true,
            collections: true,
            scenes: true,
            teams: true,
            invitations: {
              where: { status: "PENDING" },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Error fetching workspace:", error);
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

    const canAdmin = await canAdminWorkspace(user.id, id);
    if (!canAdmin) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      logoUrl,
      aiEnabled,
      slug,
    } = body as {
      name?: string;
      logoUrl?: string | null;
      aiEnabled?: boolean;
      slug?: string | null;
    };

    const updateData: {
      name?: string;
      logoUrl?: string | null;
      aiEnabled?: boolean;
      slug?: string | null;
    } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (aiEnabled !== undefined) updateData.aiEnabled = aiEnabled;
    if (slug !== undefined) updateData.slug = slug;

    const workspace = await db.workspace.update({
      where: { id },
      data: updateData,
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "workspace.update",
        entityType: "workspace",
        entityId: id,
        metadata: updateData,
      },
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Error updating workspace:", error);
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

    await db.workspace.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
