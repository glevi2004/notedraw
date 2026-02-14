import { z } from "zod";

export const WorkspaceRoleSchema = z.enum(["VIEWER", "MEMBER", "ADMIN"]);

export const PermissionErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "WORKSPACE_AI_DISABLED",
  "SCENE_ACCESS_DENIED",
  "SCENE_MUTATION_DENIED",
  "WORKSPACE_ADMIN_REQUIRED",
  "INVALID_CONTEXT_TOKEN",
]);

export const PermissionErrorSchema = z.object({
  code: PermissionErrorCodeSchema,
  message: z.string(),
  workspaceId: z.string().optional(),
  sceneId: z.string().optional(),
  requiredRole: WorkspaceRoleSchema.optional(),
  userRole: WorkspaceRoleSchema.optional(),
  retryable: z.boolean().default(false),
});

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type PermissionErrorCode = z.infer<typeof PermissionErrorCodeSchema>;
export type PermissionError = z.infer<typeof PermissionErrorSchema>;
