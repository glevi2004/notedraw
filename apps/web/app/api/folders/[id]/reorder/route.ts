import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canModifyFolder } from '@/lib/auth'
import { db } from '@/lib/db'

// POST: Reorder folder
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check modify access
    const canModify = await canModifyFolder(user.id, id)
    if (!canModify) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { order } = body

    if (typeof order !== 'number') {
      return NextResponse.json(
        { error: 'Order must be a number' },
        { status: 400 }
      )
    }

    // Get the folder to find its parent
    const folder = await db.folder.findUnique({
      where: { id },
      select: { parentFolderId: true },
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Update the folder order
    await db.folder.update({
      where: { id },
      data: { order },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering folder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
