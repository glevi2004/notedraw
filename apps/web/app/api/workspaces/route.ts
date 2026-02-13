import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await db.workspace.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
        _count: {
          select: {
            members: true,
            collections: true,
            scenes: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const serialized = workspaces.map((workspace) => ({
      ...workspace,
      role: workspace.members[0]?.role ?? null,
      members: undefined,
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
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
    const { name } = body as { name?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

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
      include: {
        _count: {
          select: {
            members: true,
            collections: true,
            scenes: true,
          },
        },
      },
    });

    await db.workspaceActivityLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "workspace.create",
        entityType: "workspace",
        entityId: workspace.id,
        metadata: { name: workspace.name },
      },
    });

    return NextResponse.json(
      { ...workspace, role: "ADMIN" as const },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
