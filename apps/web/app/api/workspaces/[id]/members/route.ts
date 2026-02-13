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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await canAccessWorkspace(user.id, id);
    if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const members = await db.workspaceMember.findMany({
      where: { workspaceId: id },
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching workspace members:", error);
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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canAdmin = await canAdminWorkspace(user.id, id);
    if (!canAdmin) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const body = await req.json();
    const { memberId, role } = body as {
      memberId?: string;
      role?: "VIEWER" | "MEMBER" | "ADMIN";
    };

    if (!memberId || !role) {
      return NextResponse.json({ error: "memberId and role are required" }, { status: 400 });
    }

    const member = await db.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updated = await db.workspaceMember.update({
      where: { id: member.id },
      data: { role },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "workspace.member.role.update",
        entityType: "workspace_member",
        entityId: updated.id,
        metadata: { role },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating workspace member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canAdmin = await canAdminWorkspace(user.id, id);
    if (!canAdmin) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const member = await db.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await db.workspaceMember.delete({ where: { id: member.id } });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "workspace.member.remove",
        entityType: "workspace_member",
        entityId: memberId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing workspace member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
