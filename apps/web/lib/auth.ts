import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

/**
 * Get the current authenticated user from Clerk and sync with database
 * Returns the database user record
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Ensure user exists in database
  const user = await ensureUserExists(userId);

  return user;
}

/**
 * Ensure user exists in database, create if missing
 * Returns the database user record
 */
export async function ensureUserExists(clerkId: string) {
  // Fetch user data from Clerk
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("User not found in Clerk");
  }

  // Upsert user (update if exists, create if missing)
  const user = await db.user.upsert({
    where: { clerkId },
    update: {
      email: clerkUser.emailAddresses[0]?.emailAddress || null,
      firstName: clerkUser.firstName || null,
      lastName: clerkUser.lastName || null,
      imageUrl: clerkUser.imageUrl || null,
    },
    create: {
      clerkId,
      email: clerkUser.emailAddresses[0]?.emailAddress || null,
      firstName: clerkUser.firstName || null,
      lastName: clerkUser.lastName || null,
      imageUrl: clerkUser.imageUrl || null,
    },
  });

  return user;
}

/**
 * Check if user can access a folder/workspace
 * Returns true if user is owner or has membership
 */
export async function canAccessFolder(
  userId: string,
  folderId: string,
): Promise<boolean> {
  const folder = await db.folder.findUnique({
    where: { id: folderId },
    include: {
      owner: true,
      members: {
        where: { userId },
      },
    },
  });

  if (!folder) {
    return false;
  }

  // Check if user is owner
  if (folder.ownerId === userId) {
    return true;
  }

  // Check if user is a member
  if (folder.members.length > 0) {
    return true;
  }

  return false;
}

/**
 * Check if user can modify a folder/workspace
 * Returns true if user is owner or has EDITOR/OWNER role
 */
export async function canModifyFolder(
  userId: string,
  folderId: string,
): Promise<boolean> {
  const folder = await db.folder.findUnique({
    where: { id: folderId },
    include: {
      owner: true,
      members: {
        where: { userId },
      },
    },
  });

  if (!folder) {
    return false;
  }

  // Check if user is owner
  if (folder.ownerId === userId) {
    return true;
  }

  // Check if user has EDITOR or OWNER role
  const member = folder.members[0];
  if (member && (member.role === "EDITOR" || member.role === "OWNER")) {
    return true;
  }

  return false;
}

/**
 * Get user's role for a folder
 * Returns 'OWNER', 'EDITOR', 'VIEWER', or null
 */
export async function getUserFolderRole(
  userId: string,
  folderId: string,
): Promise<"OWNER" | "EDITOR" | "VIEWER" | null> {
  const folder = await db.folder.findUnique({
    where: { id: folderId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!folder) {
    return null;
  }

  // Check if user is owner
  if (folder.ownerId === userId) {
    return "OWNER";
  }

  // Check member role
  const member = folder.members[0];
  if (member) {
    return member.role as "OWNER" | "EDITOR" | "VIEWER";
  }

  return null;
}
