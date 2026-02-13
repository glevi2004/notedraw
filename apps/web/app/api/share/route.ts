import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
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

    const { searchParams } = new URL(req.url);
    const sceneId = searchParams.get("sceneId");

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

    const buffer = await req.arrayBuffer();
    const id = crypto.randomUUID().replace(/-/g, "");
    const blobPath = `share/${id}/scene.bin`;

    await put(blobPath, Buffer.from(buffer), {
      access: "public",
      contentType: "application/octet-stream",
      allowOverwrite: true,
    });

    await db.shareSnapshot.create({
      data: {
        id,
        sceneId: sceneId ?? null,
        createdById: user.id,
        blobPath,
      },
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error creating share snapshot:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
