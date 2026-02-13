import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessScene, getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const sceneId: string | undefined = body?.sceneId;

    if (sceneId) {
      const scene = await db.scene.findUnique({
        where: { id: sceneId },
        select: { id: true },
      });
      if (!scene) {
        return NextResponse.json({ error: "Scene not found" }, { status: 404 });
      }

      const allowed = await canAccessScene(user.id, sceneId);
      if (!allowed) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const id = crypto.randomUUID().replace(/-/g, "");

    await db.collabRoom.create({
      data: {
        id,
        sceneId: sceneId ?? null,
        createdById: user.id,
        isPublic: true,
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({ roomId: id });
  } catch (error) {
    console.error("Error creating collab room:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
