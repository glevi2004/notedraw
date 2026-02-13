import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { Prisma } from "@/generated/prisma";
import {
  canAccessCollection,
  canAccessScene,
  canEditCollection,
  canEditScene,
  getCurrentUser,
} from "@/lib/auth";
import { buildSceneSearchText } from "@/lib/scene-search";
import { db } from "@/lib/db";

async function updateScene(
  req: NextRequest,
  params: Promise<{ id: string }>,
) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scene = await db.scene.findUnique({
    where: { id },
  });

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  const canEdit = await canEditScene(user.id, scene.id);
  if (!canEdit) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    content,
    collectionId,
  } = body as {
    title?: string;
    content?: any;
    collectionId?: string | null;
  };

  const updateData: Prisma.SceneUpdateInput = {};

  if (collectionId !== undefined && collectionId !== scene.collectionId) {
    if (collectionId === null) {
      updateData.collection = { disconnect: true };
    } else {
      const targetCollection = await db.collection.findUnique({
        where: { id: collectionId },
        select: { workspaceId: true },
      });
      if (!targetCollection || targetCollection.workspaceId !== scene.workspaceId) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      }

      const canEditTarget = await canEditCollection(user.id, collectionId);
      if (!canEditTarget) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      updateData.collection = { connect: { id: collectionId } };
    }
  }

  if (title !== undefined) {
    if (!title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    updateData.title = title.trim();
  }

  let nextContent = scene.content;
  if (content !== undefined) {
    if (content?.files && typeof content.files === "object") {
      const files = content.files as Record<string, any>;
      for (const [fileId, file] of Object.entries(files)) {
        if (!file || typeof file !== "object") continue;
        const dataURL = file.dataURL;
        if (typeof dataURL !== "string") continue;
        if (/^https?:\/\//.test(dataURL)) continue;

        if (dataURL.startsWith("data:")) {
          const ext =
            file.mimeType && typeof file.mimeType === "string"
              ? file.mimeType.split("/")[1] || "bin"
              : "bin";
          const filename = `scenes/${id}/${fileId}.${ext}`;

          try {
            const base64Data = dataURL.split(",")[1];
            if (!base64Data) continue;
            const buffer = Buffer.from(base64Data, "base64");
            const blob = await put(filename, buffer, {
              access: "public",
              allowOverwrite: true,
              contentType: file.mimeType ?? "application/octet-stream",
            });
            files[fileId] = { ...file, dataURL: blob.url };
          } catch (blobErr) {
            const message =
              blobErr instanceof Error ? blobErr.message : "Upload failed";
            return NextResponse.json(
              { error: "Failed to upload file", detail: message },
              { status: 422 },
            );
          }
        }
      }
      content.files = files;
    }

    if (content === null) {
      nextContent = null;
      updateData.content = Prisma.JsonNull;
    } else {
      nextContent = content as Prisma.JsonValue;
      updateData.content = content as Prisma.InputJsonValue;
    }
  }

  if (title !== undefined || content !== undefined) {
    updateData.searchText = buildSceneSearchText({
      title: title !== undefined ? title.trim() : scene.title,
      content: nextContent,
    });
  }

  updateData.lastEditedBy = clerkUserId;
  updateData.lastEditedAt = new Date();

  const updatedScene = await db.scene.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updatedScene);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scene = await db.scene.findUnique({ where: { id } });
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const allowed = await canAccessScene(user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (scene.collectionId) {
      const allowedCollection = await canAccessCollection(user.id, scene.collectionId);
      if (!allowedCollection) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json(scene);
  } catch (error) {
    console.error("Error fetching scene:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await updateScene(req, params);
  } catch (error) {
    console.error("Error updating scene:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await updateScene(req, params);
  } catch (error) {
    console.error("Error updating scene:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scene = await db.scene.findUnique({ where: { id } });
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const canEdit = await canEditScene(user.id, id);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    await db.scene.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scene:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
