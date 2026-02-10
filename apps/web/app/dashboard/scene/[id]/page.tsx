import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser, canAccessFolder } from '@/lib/auth'
import { SceneEditor } from './SceneEditor'

export default async function ScenePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  const scene = await db.scene.findUnique({
    where: { id },
    include: {
      folder: true,
    },
  })

  if (!scene) {
    redirect('/dashboard')
  }

  // Check if user has direct access to the scene
  let hasAccess = false
  
  if (scene.folderId) {
    hasAccess = await canAccessFolder(user.id, scene.folderId)
  } else if (scene.ownerId === user.id) {
    hasAccess = true
  }

  // If no direct access, check if there's an active public collaboration room
  // This allows users to join live sessions even if they don't own the scene
  if (!hasAccess) {
    const activeRoom = await db.collabRoom.findFirst({
      where: {
        sceneId: id,
        isPublic: true,
        revokedAt: null,
        lastActiveAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Active in last 24 hours
        },
      },
    })

    if (activeRoom) {
      hasAccess = true
    }
  }

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return (
    <SceneEditor
      sceneId={scene.id}
      title={scene.title}
      initialContent={scene.content}
    />
  )
}
