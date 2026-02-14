import type { SceneChatMessage, SceneChatRequest } from "@grovebox/ai-contracts";
import { buildSceneAIContext } from "./context-builder";
import { logAIAction } from "./audit-log";
import { streamModelTokens, type ModelClientMessage } from "./model-client";
import { streamSceneChatEvents } from "./streaming";

export type SceneChatRequestContext = {
  userId: string;
  workspaceId: string;
  sceneId: string;
};

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
const estimateTokensFromChars = (charCount: number): number =>
  Math.ceil(Math.max(0, charCount) / 4);

const toModelRole = (
  role: SceneChatMessage["role"],
): ModelClientMessage["role"] => {
  if (role === "assistant") return "assistant";
  if (role === "system") return "system";
  return "user";
};

function buildSystemPrompt(context: {
  workspaceName: string;
  sceneTitle: string;
  userRole: string | null;
  mode: SceneChatRequest["mode"];
  allowMutations: boolean;
}): string {
  return [
    "You are Notedraw AI, a diagram and visual note assistant.",
    `Workspace: ${context.workspaceName}`,
    `Scene: ${context.sceneTitle}`,
    `User role: ${context.userRole ?? "UNKNOWN"}`,
    `Mode: ${context.mode}`,
    `Mutations allowed: ${context.allowMutations ? "yes" : "no"}`,
    "Be concise and actionable.",
    "If mutation tools are unavailable, explain what you would change and why.",
  ].join("\n");
}

function toModelMessages(
  request: SceneChatRequest,
  context: { workspaceName: string; sceneTitle: string; userRole: string | null },
): ModelClientMessage[] {
  const systemPrompt = buildSystemPrompt({
    ...context,
    mode: request.mode,
    allowMutations: request.allowMutations,
  });

  const userMessages: ModelClientMessage[] = request.messages.map((message) => ({
    role: toModelRole(message.role),
    content: message.content,
  }));

  return [{ role: "system", content: systemPrompt }, ...userMessages];
}

export function orchestrateSceneChat(
  reqContext: SceneChatRequestContext,
  requestBody: SceneChatRequest,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let outputChars = 0;

      try {
        const context = await buildSceneAIContext(
          reqContext.userId,
          reqContext.workspaceId,
          reqContext.sceneId,
        );

        if (!context.workspaceAiEnabled) {
          streamSceneChatEvents(controller, {
            type: "error",
            code: "WORKSPACE_AI_DISABLED",
            message: "AI is disabled for this workspace.",
            retryable: false,
          });
          controller.close();
          return;
        }

        await logAIAction(reqContext.workspaceId, reqContext.userId, "AI_SCENE_CHAT_STARTED", {
          sceneId: reqContext.sceneId,
          mode: requestBody.mode,
          allowMutations: requestBody.allowMutations,
        });

        if (requestBody.mode === "mutate" || requestBody.allowMutations) {
          streamSceneChatEvents(controller, {
            type: "warning",
            message:
              "Mutation tool execution will be enabled in the next integration phase; returning assistant guidance only for now.",
            code: "MUTATION_EXECUTION_PENDING",
          });
        }

        const modelMessages = toModelMessages(requestBody, {
          workspaceName: context.workspaceName,
          sceneTitle: context.sceneTitle,
          userRole: context.userRole,
        });

        for await (const token of streamModelTokens(modelMessages)) {
          outputChars += token.length;
          streamSceneChatEvents(controller, {
            type: "token",
            content: token,
          });
        }

        const inputText = modelMessages.map((message) => message.content).join("\n");

        streamSceneChatEvents(controller, {
          type: "done",
          usage: {
            inputTokens: estimateTokens(inputText),
            outputTokens: estimateTokensFromChars(outputChars),
          },
        });

        await logAIAction(reqContext.workspaceId, reqContext.userId, "AI_SCENE_CHAT_COMPLETED", {
          sceneId: reqContext.sceneId,
          outputChars,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown scene chat error";

        streamSceneChatEvents(controller, {
          type: "error",
          code: "SCENE_CHAT_FAILED",
          message,
          retryable: true,
        });

        await logAIAction(reqContext.workspaceId, reqContext.userId, "AI_SCENE_CHAT_FAILED", {
          sceneId: reqContext.sceneId,
          error: message,
        });
      } finally {
        controller.close();
      }
    },
  });
}
