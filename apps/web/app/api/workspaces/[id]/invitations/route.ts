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

    const invitations = await db.workspaceInvitation.findMany({
      where: {
        workspaceId: id,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
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
    if (!canAdmin) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json();
    const { email, role } = body as {
      email?: string;
      role?: "VIEWER" | "MEMBER" | "ADMIN";
    };

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const invitation = await db.workspaceInvitation.create({
      data: {
        workspaceId: id,
        email: email.trim().toLowerCase(),
        role: role || "MEMBER",
        invitedById: user.id,
        token: crypto.randomUUID().replace(/-/g, ""),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "workspace.invite.create",
        entityType: "workspace_invitation",
        entityId: invitation.id,
        metadata: {
          email: invitation.email,
          role: invitation.role,
        },
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
