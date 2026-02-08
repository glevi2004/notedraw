import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canAccessFolder } from '@/lib/auth'
import { db } from '@/lib/db'

// GET: List user's workspaces (folders where parentFolderId is null) or folders in a parent folder
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const parentFolderId = searchParams.get('parentFolderId')

    // If parentFolderId is provided, list folders in that parent
    // Otherwise, list workspaces (top-level folders)
    const folders = await db.folder.findMany({
      where: {
        parentFolderId: parentFolderId || null,
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
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            subfolders: true,
            scenes: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create folder/workspace
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, parentFolderId } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // If parentFolderId is provided, verify user can access parent folder
    if (parentFolderId) {
      const canAccess = await canAccessFolder(user.id, parentFolderId)
      if (!canAccess) {
        return NextResponse.json(
          { error: 'Access denied to parent folder' },
          { status: 403 }
        )
      }
    }

    // Get the maximum order for folders in the same parent
    const maxOrder = await db.folder.findFirst({
      where: {
        parentFolderId: parentFolderId || null,
        ownerId: user.id,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    })

    const folder = await db.folder.create({
      data: {
        name,
        description: description || null,
        ownerId: user.id,
        parentFolderId: parentFolderId || null,
        order: (maxOrder?.order ?? -1) + 1,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            subfolders: true,
            scenes: true,
          },
        },
      },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
