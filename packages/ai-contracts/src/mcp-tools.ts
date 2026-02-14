import { z } from "zod";
import { ScenePatchSchema } from "./events";

export const ModelVisibleToolNames = [
  "read_me",
  "create_view",
  "get_scene",
  "apply_scene_patch",
  "create_scene",
  "search_workspace_scenes",
  "create_collection",
  "rename_collection",
  "move_scene",
  "list_workspace_members",
] as const;

export const AppVisibleToolNames = [
  "save_checkpoint",
  "read_checkpoint",
  "export_to_excalidraw",
  "export_to_notedraw_share",
  "upload_scene_asset",
] as const;

export const AllToolNames = [
  ...ModelVisibleToolNames,
  ...AppVisibleToolNames,
] as const;

export const McpToolNameSchema = z.enum(AllToolNames);

export const McpToolInputSchemaMap = {
  read_me: z.object({}),
  create_view: z.object({
    elements: z.string().min(1),
  }),
  get_scene: z.object({
    sceneId: z.string().min(1),
    workspaceId: z.string().min(1),
  }),
  apply_scene_patch: z.object({
    sceneId: z.string().min(1),
    workspaceId: z.string().min(1),
    patch: ScenePatchSchema,
  }),
  create_scene: z.object({
    workspaceId: z.string().min(1),
    collectionId: z.string().min(1).nullable().optional(),
    title: z.string().min(1),
  }),
  search_workspace_scenes: z.object({
    workspaceId: z.string().min(1),
    query: z.string().min(1),
    collectionId: z.string().min(1).optional(),
  }),
  create_collection: z.object({
    workspaceId: z.string().min(1),
    name: z.string().min(1),
    parentId: z.string().min(1).nullable().optional(),
  }),
  rename_collection: z.object({
    collectionId: z.string().min(1),
    name: z.string().min(1),
  }),
  move_scene: z.object({
    sceneId: z.string().min(1),
    collectionId: z.string().min(1).nullable(),
  }),
  list_workspace_members: z.object({
    workspaceId: z.string().min(1),
  }),
  save_checkpoint: z.object({
    id: z.string().min(1),
    data: z.string().min(1),
  }),
  read_checkpoint: z.object({
    id: z.string().min(1),
  }),
  export_to_excalidraw: z.object({
    json: z.string().min(1),
  }),
  export_to_notedraw_share: z.object({
    workspaceId: z.string().min(1).optional(),
    sceneId: z.string().min(1).optional(),
    payload: z.string().optional(),
  }),
  upload_scene_asset: z.object({
    workspaceId: z.string().min(1),
    sceneId: z.string().min(1),
    mimeType: z.string().min(1),
    dataBase64: z.string().min(1),
    fileName: z.string().min(1).optional(),
  }),
} as const;

export const McpToolOutputSchemaMap = {
  read_me: z.object({
    text: z.string(),
  }),
  create_view: z.object({
    checkpointId: z.string().min(1),
    message: z.string(),
  }),
  get_scene: z.object({
    sceneId: z.string(),
    workspaceId: z.string(),
    scene: z.record(z.string(), z.unknown()),
  }),
  apply_scene_patch: z.object({
    sceneId: z.string(),
    workspaceId: z.string(),
    sceneVersion: z.number().int().nonnegative(),
    appliedOps: z.number().int().nonnegative(),
    summary: z.record(z.string(), z.unknown()).optional(),
  }),
  create_scene: z.object({
    sceneId: z.string().min(1),
  }),
  search_workspace_scenes: z.object({
    scenes: z.array(z.record(z.string(), z.unknown())),
  }),
  create_collection: z.record(z.string(), z.unknown()),
  rename_collection: z.record(z.string(), z.unknown()),
  move_scene: z.record(z.string(), z.unknown()),
  list_workspace_members: z.object({
    members: z.array(z.record(z.string(), z.unknown())),
  }),
  save_checkpoint: z.object({
    ok: z.boolean(),
  }),
  read_checkpoint: z.object({
    data: z.string().nullable(),
  }),
  export_to_excalidraw: z.object({
    url: z.string().url(),
  }),
  export_to_notedraw_share: z.object({
    url: z.string().url(),
    shareId: z.string().optional(),
  }),
  upload_scene_asset: z.object({
    fileId: z.string(),
    url: z.string().url().optional(),
  }),
} as const;

export type McpToolName = z.infer<typeof McpToolNameSchema>;

export type McpToolInputSchemaMap = typeof McpToolInputSchemaMap;
export type McpToolOutputSchemaMap = typeof McpToolOutputSchemaMap;

export type McpToolInputMap = {
  [K in keyof McpToolInputSchemaMap]: z.infer<McpToolInputSchemaMap[K]>;
};

export type McpToolOutputMap = {
  [K in keyof McpToolOutputSchemaMap]: z.infer<McpToolOutputSchemaMap[K]>;
};
