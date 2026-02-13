import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma";
import {
  canAccessCollection,
  canAccessWorkspace,
  canEditCollection,
  canEditWorkspace,
  getCurrentUser,
  resolveActiveWorkspaceId,
} from "@/lib/auth";
import { buildSceneSearchText } from "@/lib/scene-search";
import { db } from "@/lib/db";

async function attachEditorNames(
  scenes: Array<{
    id: string;
    title: string;
    content: Prisma.JsonValue | null;
    workspaceId: string;
    collectionId: string | null;
    updatedAt: Date;
    lastEditedAt: Date | null;
    lastEditedBy: string | null;
    createdAt: Date;
  }>,
) {
  return Promise.all(
    scenes.map(async (scene) => {
      if (!scene.lastEditedBy) {
        return { ...scene, lastEditedByName: null };
      }

      const editor = await db.user.findUnique({
        where: { clerkId: scene.lastEditedBy },
        select: { firstName: true, lastName: true },
      });

      const name = editor
        ? `${editor.firstName || ""} ${editor.lastName || ""}`.trim() || null
        : null;

      return { ...scene, lastEditedByName: name };
    }),
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const collectionId = searchParams.get("collectionId");
    const queryRaw = searchParams.get("q") || "";
    const query = queryRaw.trim();
    const hasQuery = query.length >= 2;

    const workspaceId = await resolveActiveWorkspaceId(user.id, requestedWorkspaceId);
    if (!workspaceId) {
      return NextResponse.json([], { status: 200 });
    }

    const canAccess = await canAccessWorkspace(user.id, workspaceId);
    if (!canAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (collectionId) {
      const collection = await db.collection.findUnique({
        where: { id: collectionId },
        select: { workspaceId: true },
      });
      if (!collection || collection.workspaceId !== workspaceId) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      }
      const allowedCollection = await canAccessCollection(user.id, collectionId);
      if (!allowedCollection) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const searchFilter: Prisma.SceneWhereInput | undefined = hasQuery
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { searchText: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined;

    const where: Prisma.SceneWhereInput = {
      workspaceId,
      ...(collectionId ? { collectionId } : {}),
      ...(searchFilter || {}),
    };

    const scenes = await db.scene.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        workspaceId: true,
        collectionId: true,
        updatedAt: true,
        lastEditedAt: true,
        lastEditedBy: true,
        createdAt: true,
      },
      take: 200,
    });

    const accessible = await Promise.all(
      scenes.map(async (scene) => {
        if (!scene.collectionId) {
          return scene;
        }
        const allowed = await canAccessCollection(user.id, scene.collectionId);
        return allowed ? scene : null;
      }),
    );

    return NextResponse.json(
      await attachEditorNames(
        accessible.filter(
          (scene): scene is NonNullable<(typeof accessible)[number]> =>
            scene !== null,
        ),
      ),
    );
  } catch (error) {
    console.error("Error fetching scenes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      content,
      workspaceId: requestedWorkspaceId,
      collectionId,
    } = body as {
      title?: string;
      content?: unknown;
      workspaceId?: string;
      collectionId?: string | null;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const workspaceId = await resolveActiveWorkspaceId(
      user.id,
      requestedWorkspaceId,
    );
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace required" }, { status: 400 });
    }

    const canEdit = await canEditWorkspace(user.id, workspaceId);
    if (!canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    if (collectionId) {
      const collection = await db.collection.findUnique({
        where: { id: collectionId },
        select: { workspaceId: true },
      });
      if (!collection || collection.workspaceId !== workspaceId) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      }

      const canEditTarget = await canEditCollection(user.id, collectionId);
      if (!canEditTarget) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }
    }

    const scene = await db.scene.create({
      data: {
        title: title.trim(),
        workspaceId,
        collectionId: collectionId || null,
        createdById: user.id,
        content:
          content === undefined || content === null
            ? Prisma.JsonNull
            : (content as Prisma.InputJsonValue),
        searchText: buildSceneSearchText({
          title: title.trim(),
          content,
        }),
        lastEditedBy: clerkUserId,
        lastEditedAt: new Date(),
      },
    });

    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    console.error("Error creating scene:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
