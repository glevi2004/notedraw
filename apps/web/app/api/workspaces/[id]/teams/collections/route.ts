import { NextRequest, NextResponse } from "next/server";
import { canAdminWorkspace, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const body = await req.json();
    const { teamId, collectionId } = body as { teamId?: string; collectionId?: string };
    if (!teamId || !collectionId) {
      return NextResponse.json({ error: "teamId and collectionId are required" }, { status: 400 });
    }

    const team = await db.team.findFirst({
      where: { id: teamId, workspaceId: id },
      select: { id: true },
    });
    const collection = await db.collection.findFirst({
      where: { id: collectionId, workspaceId: id },
      select: { id: true },
    });
    if (!team || !collection) {
      return NextResponse.json({ error: "Team or collection not found" }, { status: 404 });
    }

    const link = await db.teamCollection.upsert({
      where: {
        teamId_collectionId: {
          teamId: team.id,
          collectionId: collection.id,
        },
      },
      create: {
        teamId: team.id,
        collectionId: collection.id,
      },
      update: {},
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "team.collection.link",
        entityType: "team_collection",
        entityId: link.id,
        metadata: { teamId: team.id, collectionId: collection.id },
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Error linking team collection:", error);
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
    const teamId = searchParams.get("teamId");
    const collectionId = searchParams.get("collectionId");
    if (!teamId || !collectionId) {
      return NextResponse.json({ error: "teamId and collectionId are required" }, { status: 400 });
    }

    await db.teamCollection.delete({
      where: {
        teamId_collectionId: {
          teamId,
          collectionId,
        },
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: id,
        actorUserId: user.id,
        action: "team.collection.unlink",
        entityType: "team_collection",
        metadata: { teamId, collectionId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking team collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
