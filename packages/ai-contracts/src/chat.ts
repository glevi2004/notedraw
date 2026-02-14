import { z } from "zod";

export const SceneChatMessageRoleSchema = z.enum([
  "system",
  "user",
  "assistant",
  "tool",
]);

export const SceneChatMessageSchema = z.object({
  role: SceneChatMessageRoleSchema,
  content: z.string(),
});

export const SceneChatModeSchema = z.enum(["chat", "mutate"]);

export const SceneChatRequestSchema = z.object({
  workspaceId: z.string().min(1),
  sceneId: z.string().min(1),
  messages: z.array(SceneChatMessageSchema).min(1),
  mode: SceneChatModeSchema.default("chat"),
  allowMutations: z.boolean().default(false),
});

export type SceneChatMessageRole = z.infer<typeof SceneChatMessageRoleSchema>;
export type SceneChatMessage = z.infer<typeof SceneChatMessageSchema>;
export type SceneChatMode = z.infer<typeof SceneChatModeSchema>;
export type SceneChatRequest = z.infer<typeof SceneChatRequestSchema>;
