import { db } from "@/lib/db";
import { getUserWorkspaceRole } from "@/lib/auth";

export type SceneAIContext = {
  userId: string;
  workspaceId: string;
  sceneId: string;
  workspaceName: string;
  workspaceAiEnabled: boolean;
  userRole: "VIEWER" | "MEMBER" | "ADMIN" | null;
  sceneTitle: string;
  sceneContent: unknown;
};

export async function buildSceneAIContext(
  userId: string,
  workspaceId: string,
  sceneId: string,
): Promise<SceneAIContext> {
  const [workspace, scene, userRole] = await Promise.all([
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, aiEnabled: true },
    }),
    db.scene.findUnique({
      where: { id: sceneId },
      select: { id: true, workspaceId: true, title: true, content: true },
    }),
    getUserWorkspaceRole(userId, workspaceId),
  ]);

  if (!workspace) {
    throw new Error(`Workspace \"${workspaceId}\" not found.`);
  }

  if (!scene || scene.workspaceId !== workspaceId) {
    throw new Error(`Scene \"${sceneId}\" not found in workspace \"${workspaceId}\".`);
  }

  return {
    userId,
    workspaceId,
    sceneId,
    workspaceName: workspace.name,
    workspaceAiEnabled: workspace.aiEnabled,
    userRole,
    sceneTitle: scene.title,
    sceneContent: scene.content,
  };
}
