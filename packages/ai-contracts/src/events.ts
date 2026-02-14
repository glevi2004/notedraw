import { z } from "zod";

export const SceneElementSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
  })
  .catchall(z.unknown());

export const SceneFileSchema = z.record(z.string(), z.unknown());

const AddElementOpSchema = z.object({
  op: z.literal("add_element"),
  element: SceneElementSchema,
});

const UpdateElementOpSchema = z.object({
  op: z.literal("update_element"),
  id: z.string().min(1),
  changes: z.record(z.string(), z.unknown()),
});

const DeleteElementOpSchema = z.object({
  op: z.literal("delete_element"),
  id: z.string().min(1),
});

const ReplaceElementsOpSchema = z.object({
  op: z.literal("replace_elements"),
  elements: z.array(SceneElementSchema),
});

const UpdateAppStateOpSchema = z.object({
  op: z.literal("update_app_state"),
  changes: z.record(z.string(), z.unknown()),
});

const UpsertFileOpSchema = z.object({
  op: z.literal("upsert_file"),
  fileId: z.string().min(1),
  file: z.unknown(),
});

const DeleteFileOpSchema = z.object({
  op: z.literal("delete_file"),
  fileId: z.string().min(1),
});

const SetNoteContentOpSchema = z.object({
  op: z.literal("note_set_content"),
  id: z.string().min(1),
  noteContent: z.string(),
});

const SetNoteFromTextOpSchema = z.object({
  op: z.literal("note_from_text"),
  id: z.string().min(1),
  text: z.string(),
});

const SetNoteFromMarkdownOpSchema = z.object({
  op: z.literal("note_from_markdown"),
  id: z.string().min(1),
  markdown: z.string(),
});

export const ScenePatchOpSchema = z.discriminatedUnion("op", [
  AddElementOpSchema,
  UpdateElementOpSchema,
  DeleteElementOpSchema,
  ReplaceElementsOpSchema,
  UpdateAppStateOpSchema,
  UpsertFileOpSchema,
  DeleteFileOpSchema,
  SetNoteContentOpSchema,
  SetNoteFromTextOpSchema,
  SetNoteFromMarkdownOpSchema,
]);

export const ScenePatchSchema = z.object({
  baseVersion: z.number().int().nonnegative().optional(),
  reason: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  ops: z.array(ScenePatchOpSchema).min(1),
});

export const SceneChatUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export const SceneChatResponseEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("token"),
    content: z.string(),
  }),
  z.object({
    type: z.literal("tool_start"),
    toolName: z.string(),
    callId: z.string().min(1),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("tool_result"),
    toolName: z.string(),
    callId: z.string().min(1),
    output: z.unknown(),
  }),
  z.object({
    type: z.literal("scene_patch"),
    patch: ScenePatchSchema,
    sceneVersion: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("warning"),
    message: z.string(),
    code: z.string().optional(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    code: z.string().min(1),
    retryable: z.boolean(),
  }),
  z.object({
    type: z.literal("done"),
    usage: SceneChatUsageSchema.optional(),
  }),
]);

export const SceneChatEventTypeSchema = z.enum([
  "token",
  "tool_start",
  "tool_result",
  "scene_patch",
  "warning",
  "error",
  "done",
]);

export type SceneElement = z.infer<typeof SceneElementSchema>;
export type ScenePatchOp = z.infer<typeof ScenePatchOpSchema>;
export type ScenePatch = z.infer<typeof ScenePatchSchema>;
export type SceneChatUsage = z.infer<typeof SceneChatUsageSchema>;
export type SceneChatResponseEvent = z.infer<typeof SceneChatResponseEventSchema>;
