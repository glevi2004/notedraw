import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser, canAccessFolder, canModifyFolder } from '@/lib/auth'
import { db } from '@/lib/db'

// GET: Get scene details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scene = await db.scene.findUnique({
      where: { id },
      include: {
        folder: true,
      },
    })

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    // Check access
    if (scene.folderId) {
      const canAccess = await canAccessFolder(user.id, scene.folderId)
      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    } else if (scene.ownerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(scene)
  } catch (error) {
    console.error('Error fetching scene:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update scene
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scene = await db.scene.findUnique({
      where: { id },
      include: {
        folder: true,
      },
    })

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    // Check modify access
    if (scene.folderId) {
      const canModify = await canModifyFolder(user.id, scene.folderId)
      if (!canModify) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }
    } else if (scene.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { title, content } = body

    const updateData: {
      title?: string
      content?: any
      lastEditedBy?: string
      lastEditedAt?: Date
    } = {}

    if (title !== undefined) {
      updateData.title = title
    }
    if (content !== undefined) {
      updateData.content = content
    }
    updateData.lastEditedBy = userId
    updateData.lastEditedAt = new Date()

    const updatedScene = await db.scene.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedScene)
  } catch (error) {
    console.error('Error updating scene:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete scene
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scene = await db.scene.findUnique({
      where: { id },
      include: {
        folder: true,
      },
    })

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    // Check modify access
    if (scene.folderId) {
      const canModify = await canModifyFolder(user.id, scene.folderId)
      if (!canModify) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }
    } else if (scene.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    await db.scene.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scene:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
