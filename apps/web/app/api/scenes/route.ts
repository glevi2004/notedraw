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
import { createSceneSchema, parseBody } from "@/lib/api-schemas";
import { db } from "@/lib/db";
export const runtime = 'nodejs';

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

    // Optional pagination — when `limit` is present, return { items, hasMore }
    // instead of a flat array so callers can implement "Load more" UX.
    // Backwards-compatible: callers that omit `limit` receive a flat array.
    const limitRaw = searchParams.get("limit");
    const skipRaw = searchParams.get("skip");
    const isPaginated = limitRaw !== null;
    const limit = Math.min(Math.max(parseInt(limitRaw ?? "200", 10), 1), 200);
    const skip = Math.max(parseInt(skipRaw ?? "0", 10), 0);

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

    // Use PostgreSQL full-text search when a query is present — leverages the
    // GIN index on to_tsvector('english', searchText) added in migration 0002.
    // plainto_tsquery normalises the input (splits on whitespace, ignores operators)
    // so it is safe to pass raw user input without escaping.
    // Title is also matched via ILIKE so short prefix searches still work.
    type SceneRow = {
      id: string;
      title: string;
      content: Prisma.JsonValue | null;
      workspaceId: string;
      collectionId: string | null;
      updatedAt: Date;
      lastEditedAt: Date | null;
      lastEditedBy: string | null;
      createdAt: Date;
    };

    let scenes: SceneRow[];

    if (hasQuery) {
      const collectionFilter = collectionId ? Prisma.sql`AND s."collectionId" = ${collectionId}` : Prisma.empty;
      scenes = await db.$queryRaw<SceneRow[]>`
        SELECT
          s."id", s."title", s."content", s."workspaceId", s."collectionId",
          s."updatedAt", s."lastEditedAt", s."lastEditedBy", s."createdAt"
        FROM "Scene" s
        WHERE s."workspaceId" = ${workspaceId}
          ${collectionFilter}
          AND (
            s."title" ILIKE ${'%' + query + '%'}
            OR (
              s."searchText" IS NOT NULL
              AND to_tsvector('english', s."searchText") @@ plainto_tsquery('english', ${query})
            )
          )
        ORDER BY s."updatedAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
    } else {
      const where: Prisma.SceneWhereInput = {
        workspaceId,
        ...(collectionId ? { collectionId } : {}),
      };

      scenes = await db.scene.findMany({
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
        take: limit,
        skip,
      });
    }

    const accessible = await Promise.all(
      scenes.map(async (scene) => {
        if (!scene.collectionId) {
          return scene;
        }
        const allowed = await canAccessCollection(user.id, scene.collectionId);
        return allowed ? scene : null;
      }),
    );

    const items = await attachEditorNames(
      accessible.filter(
        (scene): scene is NonNullable<(typeof accessible)[number]> =>
          scene !== null,
      ),
    );

    const headers = {
      "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
    };

    if (isPaginated) {
      return NextResponse.json(
        { items, hasMore: items.length === limit },
        { headers },
      );
    }

    return NextResponse.json(items, { headers });
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

    const parsed = parseBody(createSceneSchema, await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { title, content, workspaceId: requestedWorkspaceId, collectionId } = parsed.data;

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

    const resolvedContent =
      content === undefined || content === null
        ? Prisma.JsonNull
        : (content as Prisma.InputJsonValue);

    const scene = await db.scene.create({
      data: {
        title: title.trim(),
        workspaceId,
        collectionId: collectionId || null,
        createdById: user.id,
        content: resolvedContent,
        contentSize:
          content !== undefined && content !== null
            ? Buffer.byteLength(JSON.stringify(content), "utf8")
            : 0,
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
