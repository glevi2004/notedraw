import type { ScenePatch } from "@grovebox/ai-contracts";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type SceneChatActivityType =
  | "tool_start"
  | "tool_result"
  | "scene_patch"
  | "warning"
  | "error";

export type SceneChatActivity = {
  id: string;
  type: SceneChatActivityType;
  label: string;
  detail?: string;
  createdAt: number;
};

export type ScenePatchApplyResult = {
  ok: boolean;
  error?: string;
};

export type ScenePatchHandler = (
  patch: ScenePatch,
  sceneVersion: number,
) => ScenePatchApplyResult | Promise<ScenePatchApplyResult>;
