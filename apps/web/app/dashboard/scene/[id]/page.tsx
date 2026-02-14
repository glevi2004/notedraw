import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { canAccessScene, getCurrentUser } from '@/lib/auth'
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
  })

  if (!scene) {
    redirect('/dashboard')
  }

  let hasAccess = await canAccessScene(user.id, scene.id)

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
      workspaceId={scene.workspaceId}
      sceneId={scene.id}
      title={scene.title}
      initialContent={scene.content}
    />
  )
}
