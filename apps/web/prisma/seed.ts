import { Prisma, PrismaClient, ThemePreference, WorkspaceRole } from "../generated/prisma";

const prisma = new PrismaClient();

type SeedUser = {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  theme?: ThemePreference;
};

async function upsertSeedUser(input: SeedUser) {
  const user = await prisma.user.upsert({
    where: { clerkId: input.clerkId },
    create: {
      clerkId: input.clerkId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      imageUrl: input.imageUrl ?? null,
    },
    update: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      imageUrl: input.imageUrl ?? null,
    },
  });

  if (input.theme) {
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, theme: input.theme },
      update: { theme: input.theme },
    });
  }

  return user;
}

async function ensureWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) {
  return prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    create: { workspaceId, userId, role },
    update: { role },
  });
}

async function findOrCreateCollection(args: {
  workspaceId: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
}) {
  const existing = await prisma.collection.findFirst({
    where: {
      workspaceId: args.workspaceId,
      name: args.name,
      parentId: args.parentId ?? null,
    },
  });
  if (existing) return existing;

  return prisma.collection.create({
    data: {
      workspaceId: args.workspaceId,
      name: args.name,
      description: args.description ?? null,
      parentId: args.parentId ?? null,
      order: args.order ?? 0,
    },
  });
}

async function upsertScene(args: {
  id: string;
  title: string;
  workspaceId: string;
  collectionId?: string | null;
  createdById: string;
  lastEditedByClerkId: string;
  content?: Prisma.InputJsonValue;
}) {
  return prisma.scene.upsert({
    where: { id: args.id },
    create: {
      id: args.id,
      title: args.title,
      workspaceId: args.workspaceId,
      collectionId: args.collectionId ?? null,
      createdById: args.createdById,
      content: args.content ?? Prisma.JsonNull,
      searchText: args.title.toLowerCase(),
      lastEditedBy: args.lastEditedByClerkId,
      lastEditedAt: new Date(),
    },
    update: {
      title: args.title,
      workspaceId: args.workspaceId,
      collectionId: args.collectionId ?? null,
      createdById: args.createdById,
      content: args.content ?? Prisma.JsonNull,
      searchText: args.title.toLowerCase(),
      lastEditedBy: args.lastEditedByClerkId,
      lastEditedAt: new Date(),
    },
  });
}

async function main() {
  const admin = await upsertSeedUser({
    clerkId: "seed_admin_clerk",
    email: "admin@notedraw.dev",
    firstName: "Avery",
    lastName: "Admin",
    theme: ThemePreference.DARK,
  });
  const member = await upsertSeedUser({
    clerkId: "seed_member_clerk",
    email: "member@notedraw.dev",
    firstName: "Morgan",
    lastName: "Member",
    theme: ThemePreference.LIGHT,
  });
  const viewer = await upsertSeedUser({
    clerkId: "seed_viewer_clerk",
    email: "viewer@notedraw.dev",
    firstName: "Vivian",
    lastName: "Viewer",
    theme: ThemePreference.SYSTEM,
  });
  const invited = await upsertSeedUser({
    clerkId: "seed_invited_clerk",
    email: "invited@notedraw.dev",
    firstName: "Ira",
    lastName: "Invitee",
  });

  const workspaceA = await prisma.workspace.upsert({
    where: { slug: "acme-design" },
    create: {
      name: "Acme Design",
      slug: "acme-design",
      aiEnabled: true,
      createdById: admin.id,
    },
    update: {
      name: "Acme Design",
      aiEnabled: true,
      createdById: admin.id,
    },
  });

  const workspaceB = await prisma.workspace.upsert({
    where: { slug: "beta-lab" },
    create: {
      name: "Beta Lab",
      slug: "beta-lab",
      aiEnabled: false,
      createdById: admin.id,
    },
    update: {
      name: "Beta Lab",
      aiEnabled: false,
      createdById: admin.id,
    },
  });

  const adminMembershipA = await ensureWorkspaceMember(
    workspaceA.id,
    admin.id,
    WorkspaceRole.ADMIN,
  );
  const memberMembershipA = await ensureWorkspaceMember(
    workspaceA.id,
    member.id,
    WorkspaceRole.MEMBER,
  );
  await ensureWorkspaceMember(workspaceA.id, viewer.id, WorkspaceRole.VIEWER);
  await ensureWorkspaceMember(workspaceA.id, invited.id, WorkspaceRole.MEMBER);
  await ensureWorkspaceMember(workspaceB.id, admin.id, WorkspaceRole.ADMIN);

  const teamDesign = await prisma.team.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspaceA.id,
        name: "Design",
      },
    },
    create: {
      workspaceId: workspaceA.id,
      name: "Design",
    },
    update: {},
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_memberId: {
        teamId: teamDesign.id,
        memberId: adminMembershipA.id,
      },
    },
    create: {
      teamId: teamDesign.id,
      memberId: adminMembershipA.id,
      role: WorkspaceRole.ADMIN,
    },
    update: { role: WorkspaceRole.ADMIN },
  });
  await prisma.teamMember.upsert({
    where: {
      teamId_memberId: {
        teamId: teamDesign.id,
        memberId: memberMembershipA.id,
      },
    },
    create: {
      teamId: teamDesign.id,
      memberId: memberMembershipA.id,
      role: WorkspaceRole.MEMBER,
    },
    update: { role: WorkspaceRole.MEMBER },
  });

  const collectionMain = await findOrCreateCollection({
    workspaceId: workspaceA.id,
    name: "Main",
    order: 0,
  });
  const collectionSprint = await findOrCreateCollection({
    workspaceId: workspaceA.id,
    name: "Sprint Planning",
    order: 1,
  });
  const collectionResearch = await findOrCreateCollection({
    workspaceId: workspaceA.id,
    name: "Research",
    order: 2,
  });
  const collectionBeta = await findOrCreateCollection({
    workspaceId: workspaceB.id,
    name: "Main",
    order: 0,
  });

  await prisma.teamCollection.upsert({
    where: {
      teamId_collectionId: {
        teamId: teamDesign.id,
        collectionId: collectionSprint.id,
      },
    },
    create: {
      teamId: teamDesign.id,
      collectionId: collectionSprint.id,
    },
    update: {},
  });

  await upsertScene({
    id: "seed_scene_main_1",
    title: "Roadmap overview",
    workspaceId: workspaceA.id,
    collectionId: collectionMain.id,
    createdById: admin.id,
    lastEditedByClerkId: admin.clerkId,
    content: { type: "seed", nodes: ["roadmap", "q1", "q2"] },
  });
  await upsertScene({
    id: "seed_scene_sprint_1",
    title: "Sprint board",
    workspaceId: workspaceA.id,
    collectionId: collectionSprint.id,
    createdById: member.id,
    lastEditedByClerkId: member.clerkId,
    content: { type: "seed", nodes: ["todo", "doing", "done"] },
  });
  await upsertScene({
    id: "seed_scene_private_admin",
    title: "Private admin notes",
    workspaceId: workspaceA.id,
    collectionId: null,
    createdById: admin.id,
    lastEditedByClerkId: admin.clerkId,
    content: { type: "seed", notes: "Workspace-wide updates." },
  });
  await upsertScene({
    id: "seed_scene_research_1",
    title: "User interview map",
    workspaceId: workspaceA.id,
    collectionId: collectionResearch.id,
    createdById: member.id,
    lastEditedByClerkId: member.clerkId,
    content: { type: "seed", notes: "Interviews and themes." },
  });
  await upsertScene({
    id: "seed_scene_beta_1",
    title: "Beta workspace kickoff",
    workspaceId: workspaceB.id,
    collectionId: collectionBeta.id,
    createdById: admin.id,
    lastEditedByClerkId: admin.clerkId,
    content: { type: "seed", notes: "Second workspace baseline." },
  });

  await prisma.workspaceInvitation.upsert({
    where: { token: "seedinviteacmedesignmembertoken" },
    create: {
      workspaceId: workspaceA.id,
      email: "new-member@notedraw.dev",
      role: WorkspaceRole.MEMBER,
      status: "PENDING",
      token: "seedinviteacmedesignmembertoken",
      invitedById: admin.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      workspaceId: workspaceA.id,
      email: "new-member@notedraw.dev",
      role: WorkspaceRole.MEMBER,
      status: "PENDING",
      invitedById: admin.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
    },
  });

  const existingBootstrapLog = await prisma.workspaceActivityLog.findFirst({
    where: {
      workspaceId: workspaceA.id,
      action: "seed.bootstrap",
      entityType: "workspace",
      entityId: workspaceA.id,
    },
  });
  if (!existingBootstrapLog) {
    await prisma.workspaceActivityLog.create({
      data: {
        workspaceId: workspaceA.id,
        actorUserId: admin.id,
        action: "seed.bootstrap",
        entityType: "workspace",
        entityId: workspaceA.id,
        metadata: {
          seededCollections: [collectionMain.name, collectionSprint.name, collectionResearch.name],
          seededTeam: teamDesign.name,
        },
      },
    });
  }

  await prisma.workspaceExportJob.upsert({
    where: { id: "seed_export_job_workspace_a" },
    create: {
      id: "seed_export_job_workspace_a",
      workspaceId: workspaceA.id,
      requestedById: admin.id,
      status: "SUCCEEDED",
      scope: "accessible_scenes",
      blobPath: "exports/seed/workspace-a.zip",
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      completedAt: new Date(Date.now() - 14 * 60 * 1000),
    },
    update: {
      workspaceId: workspaceA.id,
      requestedById: admin.id,
      status: "SUCCEEDED",
      scope: "accessible_scenes",
      blobPath: "exports/seed/workspace-a.zip",
      errorMessage: null,
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      completedAt: new Date(Date.now() - 14 * 60 * 1000),
    },
  });

  await prisma.workspaceImportJob.upsert({
    where: { id: "seed_import_job_workspace_a" },
    create: {
      id: "seed_import_job_workspace_a",
      workspaceId: workspaceA.id,
      requestedById: admin.id,
      status: "SUCCEEDED",
      sourceName: "legacy-scenes.zip",
      sourcePath: "imports/seed/legacy-scenes.zip",
      summary: {
        collectionsCreated: 2,
        scenesImported: 8,
      },
      startedAt: new Date(Date.now() - 35 * 60 * 1000),
      completedAt: new Date(Date.now() - 33 * 60 * 1000),
    },
    update: {
      workspaceId: workspaceA.id,
      requestedById: admin.id,
      status: "SUCCEEDED",
      sourceName: "legacy-scenes.zip",
      sourcePath: "imports/seed/legacy-scenes.zip",
      summary: {
        collectionsCreated: 2,
        scenesImported: 8,
      },
      errorMessage: null,
      startedAt: new Date(Date.now() - 35 * 60 * 1000),
      completedAt: new Date(Date.now() - 33 * 60 * 1000),
    },
  });

  console.log("Seed completed");
  console.log(`- Workspace A: ${workspaceA.name} (${workspaceA.id})`);
  console.log(`- Workspace B: ${workspaceB.name} (${workspaceB.id})`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
