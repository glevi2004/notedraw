import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser, canAccessFolder } from '@/lib/auth'
import { buildSceneSearchText } from '@/lib/scene-search'
import { db } from '@/lib/db'

// GET: List scenes in folder (or all scenes if no folderId provided)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const folderId = searchParams.get('folderId')
    const queryRaw = searchParams.get('q') || ''
    const query = queryRaw.trim()
    const hasQuery = query.length >= 2
    const includeAll =
      searchParams.get('includeAll') === '1' ||
      searchParams.get('includeAll') === 'true'

    const searchFilter = hasQuery
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { searchText: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined

    const attachEditorNames = async (scenes: any[]) => {
      const scenesWithUserNames = await Promise.all(
        scenes.map(async (scene) => {
          if (!scene.lastEditedBy) {
            return { ...scene, lastEditedByName: null }
          }

          const editor = await db.user.findUnique({
            where: { clerkId: scene.lastEditedBy },
            select: {
              firstName: true,
              lastName: true,
            },
          })

          const name = editor
            ? `${editor.firstName || ''} ${editor.lastName || ''}`.trim() || null
            : null

          return {
            ...scene,
            lastEditedByName: name,
          }
        })
      )

      return scenesWithUserNames
    }

    // If folderId is provided, return scenes from that folder only (unless includeAll)
    if (folderId) {
      // Check access to folder
      const canAccess = await canAccessFolder(user.id, folderId)
      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      if (!includeAll) {
        const scenes = await db.scene.findMany({
          where: {
            folderId,
            ...(searchFilter ? searchFilter : {}),
          },
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            id: true,
            title: true,
            content: true,
            folderId: true,
            ownerId: true,
            updatedAt: true,
            lastEditedAt: true,
            lastEditedBy: true,
            createdAt: true,
          },
        })

        return NextResponse.json(await attachEditorNames(scenes))
      }
    }

    // If no folderId, return all scenes the user can access:
    // 1. Scenes owned by the user without folders
    // 2. Scenes from folders user has access to (owned or member of)

    // Get all folders user has access to (owned or member of)
    const accessibleFolders = await db.folder.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    })

    const folderIds = accessibleFolders.map((f) => f.id)
    const accessFilter = {
      OR: [
        { folderId: null, ownerId: user.id },
        ...(folderIds.length ? [{ folderId: { in: folderIds } }] : []),
      ],
    }

    // Get scenes: user's own folderless scenes OR scenes from accessible folders
    const scenes = await db.scene.findMany({
      where: hasQuery && searchFilter
        ? {
            AND: [accessFilter, searchFilter],
          }
        : accessFilter,
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        content: true,
        folderId: true,
        ownerId: true,
        updatedAt: true,
        lastEditedAt: true,
        lastEditedBy: true,
        createdAt: true,
      },
    })

    return NextResponse.json(await attachEditorNames(scenes))
  } catch (error) {
    console.error('Error fetching scenes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create scene
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, folderId, content } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // If folderId is provided, check access to folder
    if (folderId) {
      const canAccess = await canAccessFolder(user.id, folderId)
      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const scene = await db.scene.create({
      data: {
        title,
        ownerId: user.id,
        folderId: folderId || null,
        content: content || null,
        searchText: buildSceneSearchText({ title, content }),
        lastEditedBy: userId,
        lastEditedAt: new Date(),
      },
    })

    return NextResponse.json(scene, { status: 201 })
  } catch (error) {
    console.error('Error creating scene:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
