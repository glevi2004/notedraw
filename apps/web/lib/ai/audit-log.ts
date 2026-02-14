import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

export async function logAIAction(
  workspaceId: string,
  actorUserId: string | null,
  action: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.workspaceActivityLog.create({
      data: {
        workspaceId,
        actorUserId: actorUserId ?? undefined,
        action,
        entityType: "AI",
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("Failed to write AI audit log", {
      workspaceId,
      actorUserId,
      action,
      error,
    });
  }
}
