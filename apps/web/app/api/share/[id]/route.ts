import { NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const snapshot = await db.shareSnapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (snapshot.revokedAt) {
      return NextResponse.json({ error: "Revoked" }, { status: 410 });
    }
    if (snapshot.expiresAt && snapshot.expiresAt < new Date()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    const meta = await head(snapshot.blobPath);
    return NextResponse.json({ url: meta.url, sceneId: snapshot.sceneId });
  } catch (error) {
    console.error("Error fetching share snapshot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
