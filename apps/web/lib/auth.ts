import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export type WorkspaceRoleValue = "VIEWER" | "MEMBER" | "ADMIN";

/**
 * Get the current authenticated user from Clerk and sync with database.
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return ensureUserExists(userId);
}

/**
 * Ensure user exists in database, create if missing.
 */
export async function ensureUserExists(clerkId: string) {
  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) {
    return existing;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("User not found in Clerk");
  }

  const user = await db.user.create({
    data: {
      clerkId,
      email: clerkUser.emailAddresses[0]?.emailAddress || null,
      firstName: clerkUser.firstName || null,
      lastName: clerkUser.lastName || null,
      imageUrl: clerkUser.imageUrl || null,
    },
  });

  return user;
}

export async function hasWorkspaceMembership(userId: string) {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  return Boolean(membership);
}

/**
 * Resolve which workspace should be active for the user.
 * If requested workspace is accessible, it is returned.
 * Otherwise it falls back to earliest membership.
 */
export async function resolveActiveWorkspaceId(
  userId: string,
  requestedWorkspaceId?: string | null,
) {
  if (requestedWorkspaceId) {
    const hasRequested = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: requestedWorkspaceId,
          userId,
        },
      },
      select: { workspaceId: true },
    });
    if (hasRequested) {
      return hasRequested.workspaceId;
    }
  }

  const firstMembership = await db.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true, user: { select: { firstName: true, lastName: true, email: true } } },
  });

  if (firstMembership) {
    return firstMembership.workspaceId;
  }

  return null;
}

export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRoleValue | null> {
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: { role: true },
  });
  return (membership?.role as WorkspaceRoleValue | undefined) ?? null;
}

export async function canAccessWorkspace(userId: string, workspaceId: string) {
  const role = await getUserWorkspaceRole(userId, workspaceId);
  return role !== null;
}

export async function canEditWorkspace(userId: string, workspaceId: string) {
  const role = await getUserWorkspaceRole(userId, workspaceId);
  return role === "MEMBER" || role === "ADMIN";
}

export async function canAdminWorkspace(userId: string, workspaceId: string) {
  const role = await getUserWorkspaceRole(userId, workspaceId);
  return role === "ADMIN";
}

async function getWorkspaceMember(userId: string, workspaceId: string) {
  return db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });
}

async function hasCollectionTeamAccess(
  collectionId: string,
  workspaceMemberId: string,
) {
  const teamLinks = await db.teamCollection.findMany({
    where: { collectionId },
    select: { teamId: true },
  });

  if (!teamLinks.length) {
    return true;
  }

  const teamIds = teamLinks.map((teamLink) => teamLink.teamId);
  const memberCount = await db.teamMember.count({
    where: {
      memberId: workspaceMemberId,
      teamId: { in: teamIds },
    },
  });

  return memberCount > 0;
}

export async function canAccessCollection(userId: string, collectionId: string) {
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { workspaceId: true },
  });

  if (!collection) {
    return false;
  }

  const membership = await getWorkspaceMember(userId, collection.workspaceId);
  if (!membership) {
    return false;
  }

  return hasCollectionTeamAccess(collectionId, membership.id);
}

export async function canEditCollection(userId: string, collectionId: string) {
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { workspaceId: true },
  });

  if (!collection) {
    return false;
  }

  const membership = await getWorkspaceMember(userId, collection.workspaceId);
  if (!membership) {
    return false;
  }
  if (membership.role === "VIEWER") {
    return false;
  }

  return hasCollectionTeamAccess(collectionId, membership.id);
}

export async function canAccessScene(userId: string, sceneId: string) {
  const scene = await db.scene.findUnique({
    where: { id: sceneId },
    select: { workspaceId: true, collectionId: true },
  });

  if (!scene) {
    return false;
  }

  const membership = await getWorkspaceMember(userId, scene.workspaceId);
  if (!membership) {
    return false;
  }

  if (!scene.collectionId) {
    return true;
  }

  return hasCollectionTeamAccess(scene.collectionId, membership.id);
}

export async function canEditScene(userId: string, sceneId: string) {
  const scene = await db.scene.findUnique({
    where: { id: sceneId },
    select: { workspaceId: true, collectionId: true },
  });

  if (!scene) {
    return false;
  }

  const membership = await getWorkspaceMember(userId, scene.workspaceId);
  if (!membership) {
    return false;
  }
  if (membership.role === "VIEWER") {
    return false;
  }

  if (!scene.collectionId) {
    return true;
  }

  return hasCollectionTeamAccess(scene.collectionId, membership.id);
}

export function canAccessOwnAccount(requestingUserId: string, targetUserId: string) {
  return requestingUserId === targetUserId;
}
