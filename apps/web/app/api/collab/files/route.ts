import { NextResponse } from "next/server";
import { put, head } from "@vercel/blob";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const fileId = searchParams.get("fileId");

  if (!roomId || !fileId) {
    return NextResponse.json({ error: "Missing roomId or fileId" }, { status: 400 });
  }

  try {
    const buffer = await req.arrayBuffer();
    const pathname = `collab/rooms/${roomId}/${fileId}`;
    const blob = await put(pathname, Buffer.from(buffer), {
      access: "public",
      contentType: "application/octet-stream",
      allowOverwrite: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Error uploading collab file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const fileId = searchParams.get("fileId");

  if (!roomId || !fileId) {
    return NextResponse.json({ error: "Missing roomId or fileId" }, { status: 400 });
  }

  try {
    const pathname = `collab/rooms/${roomId}/${fileId}`;
    const meta = await head(pathname);
    return NextResponse.json({ url: meta.url });
  } catch (error) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
