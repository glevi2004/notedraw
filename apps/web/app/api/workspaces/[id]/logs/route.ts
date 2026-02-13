import { NextRequest, NextResponse } from "next/server";
import { canAccessWorkspace, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await canAccessWorkspace(user.id, id);
    if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const searchParams = req.nextUrl.searchParams;
    const actorUserId = searchParams.get("actorUserId");
    const action = searchParams.get("action");

    const logs = await db.workspaceActivityLog.findMany({
      where: {
        workspaceId: id,
        ...(actorUserId ? { actorUserId } : {}),
        ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
      },
      include: {
        actorUser: {
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
        createdAt: "desc",
      },
      take: 200,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
