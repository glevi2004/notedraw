import { NextResponse } from "next/server";
import { put, head } from "@vercel/blob";

// Collab file uploads are intentionally public (access: "public") and unauthenticated.
// Excalidraw's real-time collaboration does not require login — any participant in a
// room can upload media (images, etc.) so collaborators can view them without auth.
// The blob URL is unguessable (contains a random ID), which is the access-control
// mechanism here rather than server-side auth.
//
// SECURITY BOUNDARIES enforced below:
//  - roomId and fileId must be alphanumeric+hyphens (prevent path traversal)
//  - file size capped at MAX_COLLAB_FILE_BYTES (prevent blob cost abuse)
//  - allowed content types are restricted to common media types

const MAX_COLLAB_FILE_BYTES = Number(
  process.env.COLLAB_MAX_FILE_BYTES ?? 10 * 1024 * 1024, // 10 MB default
);

// Safe segment: alphanumeric, hyphens, underscores only. No dots, slashes, etc.
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/octet-stream", // Excalidraw encrypted binary payloads
]);

function validateSegment(value: string): boolean {
  return value.length > 0 && value.length <= 128 && SAFE_SEGMENT.test(value);
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const fileId = searchParams.get("fileId");

  if (!roomId || !fileId) {
    return NextResponse.json({ error: "Missing roomId or fileId" }, { status: 400 });
  }

  if (!validateSegment(roomId) || !validateSegment(fileId)) {
    return NextResponse.json({ error: "Invalid roomId or fileId" }, { status: 400 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_COLLAB_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_COLLAB_FILE_BYTES / (1024 * 1024)} MB.` },
      { status: 413 },
    );
  }

  const contentType = req.headers.get("content-type")?.split(";")[0].trim() ?? "application/octet-stream";
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  try {
    const buffer = await req.arrayBuffer();
    if (buffer.byteLength > MAX_COLLAB_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_COLLAB_FILE_BYTES / (1024 * 1024)} MB.` },
        { status: 413 },
      );
    }

    const pathname = `collab/rooms/${roomId}/${fileId}`;
    const blob = await put(pathname, Buffer.from(buffer), {
      // Public: collab participants need direct browser access to the URL.
      // The unguessable blob URL acts as the access token.
      access: "public",
      contentType,
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

  if (!validateSegment(roomId) || !validateSegment(fileId)) {
    return NextResponse.json({ error: "Invalid roomId or fileId" }, { status: 400 });
  }

  try {
    const pathname = `collab/rooms/${roomId}/${fileId}`;
    const meta = await head(pathname);
    return NextResponse.json({ url: meta.url });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
