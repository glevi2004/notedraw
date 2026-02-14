import { callMcpTool } from "./mcp-client";

export type ToolCall = {
  toolName: string;
  input: unknown;
  callId: string;
};

export type ToolExecutionContext = {
  userId: string;
  workspaceId: string;
  sceneId: string;
};

export type ToolExecutionResult = {
  ok: boolean;
  toolName: string;
  callId: string;
  output?: unknown;
  error?: string;
};

const workspaceScopedTools = new Set([
  "get_scene",
  "apply_scene_patch",
  "create_scene",
  "search_workspace_scenes",
  "create_collection",
  "list_workspace_members",
]);

export async function executeToolCall(
  toolCall: ToolCall,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const baseInput =
    toolCall.input && typeof toolCall.input === "object"
      ? { ...(toolCall.input as Record<string, unknown>) }
      : {};

  if (workspaceScopedTools.has(toolCall.toolName)) {
    if (baseInput.workspaceId == null) {
      baseInput.workspaceId = ctx.workspaceId;
    }
    if (baseInput.sceneId == null && toolCall.toolName !== "create_scene") {
      baseInput.sceneId = ctx.sceneId;
    }
  }

  const result = await callMcpTool(toolCall.toolName, baseInput);

  if (!result.ok) {
    return {
      ok: false,
      toolName: toolCall.toolName,
      callId: toolCall.callId,
      error: result.error,
    };
  }

  return {
    ok: true,
    toolName: toolCall.toolName,
    callId: toolCall.callId,
    output: result.result,
  };
}
