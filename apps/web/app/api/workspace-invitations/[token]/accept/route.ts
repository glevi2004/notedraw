import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invitation = await db.workspaceInvitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.status !== "PENDING") {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await db.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
    }

    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({ error: "Invitation email mismatch" }, { status: 403 });
    }

    await db.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
        },
      },
      create: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
      },
      update: {
        role: invitation.role,
      },
    });

    await db.workspaceInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: invitation.workspaceId,
        actorUserId: user.id,
        action: "workspace.invite.accept",
        entityType: "workspace_invitation",
        entityId: invitation.id,
      },
    });

    return NextResponse.json({ success: true, workspaceId: invitation.workspaceId });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
