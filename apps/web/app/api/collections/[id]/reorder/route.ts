import { NextRequest, NextResponse } from "next/server";
import { canEditCollection, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const allowed = await canEditCollection(user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json();
    const { order } = body as { order?: number };
    if (typeof order !== "number") {
      return NextResponse.json({ error: "Order must be a number" }, { status: 400 });
    }

    const collection = await db.collection.update({
      where: { id },
      data: { order },
      select: { id: true, workspaceId: true, order: true },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: collection.workspaceId,
        actorUserId: user.id,
        action: "collection.reorder",
        entityType: "collection",
        entityId: collection.id,
        metadata: { order },
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Error reordering collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
