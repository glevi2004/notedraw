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

  // Check access
  if (scene.folderId) {
    const canAccess = await canAccessFolder(user.id, scene.folderId)
    if (!canAccess) {
      redirect('/dashboard')
    }
  } else if (scene.ownerId !== user.id) {
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
