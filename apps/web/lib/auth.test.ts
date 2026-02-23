import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    collection: {
      findUnique: vi.fn(),
    },
    teamCollection: {
      findMany: vi.fn(),
    },
    teamMember: {
      count: vi.fn(),
    },
    scene: {
      findUnique: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

import { db } from "./db";
import {
  canAccessWorkspace,
  canEditWorkspace,
  canAdminWorkspace,
  canAccessCollection,
  canEditCollection,
  canAccessScene,
  canEditScene,
  resolveActiveWorkspaceId,
} from "./auth";

// Typed helpers to keep tests concise
const wsMember = db.workspaceMember as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
};
const col = db.collection as unknown as { findUnique: ReturnType<typeof vi.fn> };
const teamCol = db.teamCollection as unknown as { findMany: ReturnType<typeof vi.fn> };
const teamMbr = db.teamMember as unknown as { count: ReturnType<typeof vi.fn> };
const scene = db.scene as unknown as { findUnique: ReturnType<typeof vi.fn> };

const USER_ID = "user-1";
const WORKSPACE_ID = "ws-1";
const COLLECTION_ID = "col-1";
const SCENE_ID = "scene-1";
const MEMBER_ID = "member-1";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// canAccessWorkspace
// ---------------------------------------------------------------------------
describe("canAccessWorkspace", () => {
  it("returns true when user has any workspace role", async () => {
    wsMember.findUnique.mockResolvedValue({ role: "VIEWER" });
    expect(await canAccessWorkspace(USER_ID, WORKSPACE_ID)).toBe(true);
  });

  it("returns false when user is not a member", async () => {
    wsMember.findUnique.mockResolvedValue(null);
    expect(await canAccessWorkspace(USER_ID, WORKSPACE_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canEditWorkspace
// ---------------------------------------------------------------------------
describe("canEditWorkspace", () => {
  it.each(["MEMBER", "ADMIN"])("returns true for role %s", async (role) => {
    wsMember.findUnique.mockResolvedValue({ role });
    expect(await canEditWorkspace(USER_ID, WORKSPACE_ID)).toBe(true);
  });

  it("returns false for VIEWER", async () => {
    wsMember.findUnique.mockResolvedValue({ role: "VIEWER" });
    expect(await canEditWorkspace(USER_ID, WORKSPACE_ID)).toBe(false);
  });

  it("returns false for non-member", async () => {
    wsMember.findUnique.mockResolvedValue(null);
    expect(await canEditWorkspace(USER_ID, WORKSPACE_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canAdminWorkspace
// ---------------------------------------------------------------------------
describe("canAdminWorkspace", () => {
  it("returns true for ADMIN", async () => {
    wsMember.findUnique.mockResolvedValue({ role: "ADMIN" });
    expect(await canAdminWorkspace(USER_ID, WORKSPACE_ID)).toBe(true);
  });

  it.each(["MEMBER", "VIEWER"])("returns false for role %s", async (role) => {
    wsMember.findUnique.mockResolvedValue({ role });
    expect(await canAdminWorkspace(USER_ID, WORKSPACE_ID)).toBe(false);
  });

  it("returns false for non-member", async () => {
    wsMember.findUnique.mockResolvedValue(null);
    expect(await canAdminWorkspace(USER_ID, WORKSPACE_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canAccessCollection
// ---------------------------------------------------------------------------
describe("canAccessCollection", () => {
  const setupCollection = (
    memberRole: string | null,
    teamLinks: string[],
    teamMemberCount = 0,
  ) => {
    col.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID });
    wsMember.findUnique.mockResolvedValue(
      memberRole ? { id: MEMBER_ID, role: memberRole } : null,
    );
    teamCol.findMany.mockResolvedValue(teamLinks.map((id) => ({ teamId: id })));
    teamMbr.count.mockResolvedValue(teamMemberCount);
  };

  it("returns false when the collection does not exist", async () => {
    col.findUnique.mockResolvedValue(null);
    expect(await canAccessCollection(USER_ID, COLLECTION_ID)).toBe(false);
  });

  it("returns false when user is not a workspace member", async () => {
    setupCollection(null, []);
    expect(await canAccessCollection(USER_ID, COLLECTION_ID)).toBe(false);
  });

  it("returns true when there are no team restrictions", async () => {
    setupCollection("VIEWER", []);
    expect(await canAccessCollection(USER_ID, COLLECTION_ID)).toBe(true);
  });

  it("returns true when user belongs to a team with access", async () => {
    setupCollection("MEMBER", ["team-1"], 1);
    expect(await canAccessCollection(USER_ID, COLLECTION_ID)).toBe(true);
  });

  it("returns false when user is not in any team with access", async () => {
    setupCollection("MEMBER", ["team-1"], 0);
    expect(await canAccessCollection(USER_ID, COLLECTION_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canEditCollection
// ---------------------------------------------------------------------------
describe("canEditCollection", () => {
  it("returns false when collection does not exist", async () => {
    col.findUnique.mockResolvedValue(null);
    expect(await canEditCollection(USER_ID, COLLECTION_ID)).toBe(false);
  });

  it("returns false when user is not a member", async () => {
    col.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID });
    wsMember.findUnique.mockResolvedValue(null);
    expect(await canEditCollection(USER_ID, COLLECTION_ID)).toBe(false);
  });

  it("returns false for VIEWER even with open team access", async () => {
    col.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "VIEWER" });
    expect(await canEditCollection(USER_ID, COLLECTION_ID)).toBe(false);
  });

  it("returns true for MEMBER with no team restrictions", async () => {
    col.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "MEMBER" });
    teamCol.findMany.mockResolvedValue([]);
    expect(await canEditCollection(USER_ID, COLLECTION_ID)).toBe(true);
  });

  it("returns true for ADMIN with no team restrictions", async () => {
    col.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "ADMIN" });
    teamCol.findMany.mockResolvedValue([]);
    expect(await canEditCollection(USER_ID, COLLECTION_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canAccessScene
// ---------------------------------------------------------------------------
describe("canAccessScene", () => {
  it("returns false when scene does not exist", async () => {
    scene.findUnique.mockResolvedValue(null);
    expect(await canAccessScene(USER_ID, SCENE_ID)).toBe(false);
  });

  it("returns false when user is not a workspace member", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: null });
    wsMember.findUnique.mockResolvedValue(null);
    expect(await canAccessScene(USER_ID, SCENE_ID)).toBe(false);
  });

  it("returns true for a scene not in any collection", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: null });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "VIEWER" });
    expect(await canAccessScene(USER_ID, SCENE_ID)).toBe(true);
  });

  it("returns true for a collection scene with no team restrictions", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: COLLECTION_ID });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "VIEWER" });
    teamCol.findMany.mockResolvedValue([]);
    expect(await canAccessScene(USER_ID, SCENE_ID)).toBe(true);
  });

  it("returns false for a collection scene when user lacks team access", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: COLLECTION_ID });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "MEMBER" });
    teamCol.findMany.mockResolvedValue([{ teamId: "team-1" }]);
    teamMbr.count.mockResolvedValue(0);
    expect(await canAccessScene(USER_ID, SCENE_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canEditScene
// ---------------------------------------------------------------------------
describe("canEditScene", () => {
  it("returns false when scene does not exist", async () => {
    scene.findUnique.mockResolvedValue(null);
    expect(await canEditScene(USER_ID, SCENE_ID)).toBe(false);
  });

  it("returns false when user is not a member", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: null });
    wsMember.findUnique.mockResolvedValue(null);
    expect(await canEditScene(USER_ID, SCENE_ID)).toBe(false);
  });

  it("returns false for VIEWER", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: null });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "VIEWER" });
    expect(await canEditScene(USER_ID, SCENE_ID)).toBe(false);
  });

  it("returns true for MEMBER with scene not in any collection", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: null });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "MEMBER" });
    expect(await canEditScene(USER_ID, SCENE_ID)).toBe(true);
  });

  it("returns true for ADMIN with scene not in any collection", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: null });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "ADMIN" });
    expect(await canEditScene(USER_ID, SCENE_ID)).toBe(true);
  });

  it("returns true for MEMBER in collection with no team restrictions", async () => {
    scene.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, collectionId: COLLECTION_ID });
    wsMember.findUnique.mockResolvedValue({ id: MEMBER_ID, role: "MEMBER" });
    teamCol.findMany.mockResolvedValue([]);
    expect(await canEditScene(USER_ID, SCENE_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveActiveWorkspaceId
// ---------------------------------------------------------------------------
describe("resolveActiveWorkspaceId", () => {
  it("returns requested workspace when user is a member", async () => {
    wsMember.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID });
    const result = await resolveActiveWorkspaceId(USER_ID, WORKSPACE_ID);
    expect(result).toBe(WORKSPACE_ID);
  });

  it("falls back to first membership when requested workspace is inaccessible", async () => {
    wsMember.findUnique.mockResolvedValue(null);
    wsMember.findFirst.mockResolvedValue({ workspaceId: "ws-fallback" });
    const result = await resolveActiveWorkspaceId(USER_ID, "ws-other");
    expect(result).toBe("ws-fallback");
  });

  it("returns first membership when no workspace is requested", async () => {
    wsMember.findFirst.mockResolvedValue({ workspaceId: WORKSPACE_ID });
    const result = await resolveActiveWorkspaceId(USER_ID);
    expect(result).toBe(WORKSPACE_ID);
  });

  it("returns null when user has no workspace memberships", async () => {
    wsMember.findFirst.mockResolvedValue(null);
    const result = await resolveActiveWorkspaceId(USER_ID);
    expect(result).toBeNull();
  });
});
