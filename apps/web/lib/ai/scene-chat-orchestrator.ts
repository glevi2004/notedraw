import {
  ScenePatchSchema,
  type SceneChatMessage,
  type SceneChatRequest,
  type ScenePatch,
} from "@grovebox/ai-contracts";
import { applyScenePatch, type SceneState } from "@grovebox/scene-ops";
import { z } from "zod";
import { buildSceneAIContext } from "./context-builder";
import { logAIAction } from "./audit-log";
import {
  completeModelText,
  streamModelTokens,
  type ModelClientMessage,
} from "./model-client";
import { streamSceneChatEvents } from "./streaming";

export type SceneChatRequestContext = {
  userId: string;
  workspaceId: string;
  sceneId: string;
};

const TOOL_NAME_APPLY_SCENE_PATCH = "apply_scene_patch";
const SCENE_PROMPT_MAX_CHARS = 60_000;

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

const mutationEnabled = (requestBody: SceneChatRequest): boolean =>
  requestBody.mode === "mutate" || requestBody.allowMutations;

const sanitizeJsonPayload = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return trimmed;
};

const safeParseSceneState = (sceneContent: unknown): SceneState => {
  let raw = sceneContent;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  if (!raw || typeof raw !== "object") {
    return { elements: [], appState: {}, files: {}, version: 0 };
  }

  const payload = raw as Record<string, unknown>;
  return {
    elements: Array.isArray(payload.elements)
      ? (payload.elements as SceneState["elements"])
      : [],
    appState:
      payload.appState && typeof payload.appState === "object"
        ? (payload.appState as Record<string, unknown>)
        : {},
    files:
      payload.files && typeof payload.files === "object"
        ? (payload.files as Record<string, unknown>)
        : {},
    version: typeof payload.version === "number" ? payload.version : 0,
  };
};

function buildSystemPrompt(context: {
  workspaceName: string;
  sceneTitle: string;
  userRole: string | null;
  mode: SceneChatRequest["mode"];
  allowMutations: boolean;
  mutationSummary?: string | null;
}): string {
  return [
    "You are Notedraw AI, a diagram and visual note assistant.",
    `Workspace: ${context.workspaceName}`,
    `Scene: ${context.sceneTitle}`,
    `User role: ${context.userRole ?? "UNKNOWN"}`,
    `Mode: ${context.mode}`,
    `Mutations allowed: ${context.allowMutations ? "yes" : "no"}`,
    context.mutationSummary
      ? `Mutation status: ${context.mutationSummary}`
      : "Mutation status: no patch emitted yet.",
    "Be concise and actionable.",
    "If changes were applied, explain what changed and what remains.",
  ].join("\n");
}

function toModelMessages(
  request: SceneChatRequest,
  context: {
    workspaceName: string;
    sceneTitle: string;
    userRole: string | null;
    mutationSummary?: string | null;
  },
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

const PatchPlanSchema = z.object({
  patch: ScenePatchSchema.nullable(),
  rationale: z.string().optional(),
});

const buildPatchPlanMessages = (params: {
  workspaceName: string;
  sceneTitle: string;
  sceneState: SceneState;
  userRole: string | null;
  latestUserPrompt: string;
}): ModelClientMessage[] => {
  const serializedScene = JSON.stringify(params.sceneState);
  const sceneSnapshot =
    serializedScene.length > SCENE_PROMPT_MAX_CHARS
      ? `${serializedScene.slice(0, SCENE_PROMPT_MAX_CHARS)}...(truncated)`
      : serializedScene;

  return [
    {
      role: "system",
      content: [
        "You generate Notedraw scene mutations.",
        "Return strictly JSON with shape:",
        '{"patch": ScenePatch | null, "rationale": string}',
        "If no scene change is needed, set patch to null.",
        "When changing notes from user prose, prefer note_from_text or note_from_markdown ops.",
        "Never include markdown fences.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Workspace: ${params.workspaceName}`,
        `Scene: ${params.sceneTitle}`,
        `Role: ${params.userRole ?? "UNKNOWN"}`,
        `User request: ${params.latestUserPrompt}`,
        "Current scene JSON:",
        sceneSnapshot,
      ].join("\n"),
    },
  ];
};

const lastUserMessage = (messages: SceneChatMessage[]): string => {
  const message = [...messages].reverse().find((item) => item.role === "user");
  return message?.content ?? "";
};

const generatePatchPlan = async (params: {
  workspaceName: string;
  sceneTitle: string;
  sceneState: SceneState;
  userRole: string | null;
  latestUserPrompt: string;
}): Promise<z.infer<typeof PatchPlanSchema> | null> => {
  const completion = await completeModelText(
    buildPatchPlanMessages(params),
    { temperature: 0.0 },
  );

  if (!completion) {
    return null;
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(sanitizeJsonPayload(completion));
  } catch {
    return null;
  }

  const plan = PatchPlanSchema.safeParse(parsed);
  if (!plan.success) {
    return null;
  }

  return plan.data;
};

export function orchestrateSceneChat(
  reqContext: SceneChatRequestContext,
  requestBody: SceneChatRequest,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let outputChars = 0;
      let mutationSummary: string | null = null;

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

        await logAIAction(
          reqContext.workspaceId,
          reqContext.userId,
          "AI_SCENE_CHAT_STARTED",
          {
            sceneId: reqContext.sceneId,
            mode: requestBody.mode,
            allowMutations: requestBody.allowMutations,
          },
        );

        if (mutationEnabled(requestBody)) {
          const callId = `tool_${Date.now().toString(36)}`;
          streamSceneChatEvents(controller, {
            type: "tool_start",
            toolName: TOOL_NAME_APPLY_SCENE_PATCH,
            callId,
            input: {
              workspaceId: context.workspaceId,
              sceneId: context.sceneId,
            },
          });

          try {
            const baseScene = safeParseSceneState(context.sceneContent);
            const patchPlan = await generatePatchPlan({
              workspaceName: context.workspaceName,
              sceneTitle: context.sceneTitle,
              sceneState: baseScene,
              userRole: context.userRole,
              latestUserPrompt: lastUserMessage(requestBody.messages),
            });

            if (!patchPlan?.patch) {
              mutationSummary = "No scene patch generated for this prompt.";
              streamSceneChatEvents(controller, {
                type: "tool_result",
                toolName: TOOL_NAME_APPLY_SCENE_PATCH,
                callId,
                output: {
                  applied: false,
                  reason:
                    patchPlan?.rationale ??
                    "Model did not emit a valid mutation patch.",
                },
              });

              await logAIAction(
                reqContext.workspaceId,
                reqContext.userId,
                "AI_TOOL_RESULT",
                {
                  sceneId: reqContext.sceneId,
                  toolName: TOOL_NAME_APPLY_SCENE_PATCH,
                  applied: false,
                  reason: patchPlan?.rationale ?? null,
                },
              );
            } else {
              const applied = applyScenePatch(baseScene, patchPlan.patch as ScenePatch);
              if (!applied.ok) {
                mutationSummary = "Patch rejected by validation.";
                streamSceneChatEvents(controller, {
                  type: "warning",
                  code: "PATCH_VALIDATION_FAILED",
                  message: applied.errors.join("; "),
                });
                streamSceneChatEvents(controller, {
                  type: "tool_result",
                  toolName: TOOL_NAME_APPLY_SCENE_PATCH,
                  callId,
                  output: { applied: false, errors: applied.errors },
                });
              } else {
                mutationSummary = `Applied ${patchPlan.patch.ops.length} operations to scene.`;
                streamSceneChatEvents(controller, {
                  type: "tool_result",
                  toolName: TOOL_NAME_APPLY_SCENE_PATCH,
                  callId,
                  output: {
                    applied: true,
                    appliedOps: patchPlan.patch.ops.length,
                    sceneVersion: applied.scene.version ?? 0,
                    warnings: applied.warnings,
                  },
                });
                streamSceneChatEvents(controller, {
                  type: "scene_patch",
                  patch: patchPlan.patch as ScenePatch,
                  sceneVersion: applied.scene.version ?? 0,
                });

                await logAIAction(
                  reqContext.workspaceId,
                  reqContext.userId,
                  "AI_SCENE_PATCH_EMITTED",
                  {
                    sceneId: reqContext.sceneId,
                    ops: patchPlan.patch.ops.length,
                    warnings: applied.warnings,
                  },
                );
              }
            }
          } catch (patchError) {
            const patchMessage =
              patchError instanceof Error ? patchError.message : "Unknown patch planning failure";
            mutationSummary = "Patch planning failed; returned text guidance only.";
            streamSceneChatEvents(controller, {
              type: "warning",
              code: "PATCH_PLANNING_FAILED",
              message: patchMessage,
            });
            streamSceneChatEvents(controller, {
              type: "tool_result",
              toolName: TOOL_NAME_APPLY_SCENE_PATCH,
              callId,
              output: { applied: false, error: patchMessage },
            });
          }
        }

        const modelMessages = toModelMessages(requestBody, {
          workspaceName: context.workspaceName,
          sceneTitle: context.sceneTitle,
          userRole: context.userRole,
          mutationSummary,
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

        await logAIAction(
          reqContext.workspaceId,
          reqContext.userId,
          "AI_SCENE_CHAT_COMPLETED",
          {
            sceneId: reqContext.sceneId,
            outputChars,
            mutationSummary,
          },
        );
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
