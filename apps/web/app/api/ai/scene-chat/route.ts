import { NextRequest } from "next/server";
import { SceneChatRequestSchema, type SceneChatRequest } from "@grovebox/ai-contracts";
import { randomUUID } from "node:crypto";
import {
  SCENE_CHAT_SSE_HEADERS,
  checkSceneChatRateLimit,
  orchestrateSceneChat,
} from "@/lib/ai";
import {
  canAccessScene,
  canEditScene,
  canUseWorkspaceAI,
  getCurrentUser,
} from "@/lib/auth";

export const runtime = "nodejs";

function jsonError(
  status: number,
  error: string,
  code: string,
  requestId: string,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify({ error, code, requestId }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": requestId,
      ...extraHeaders,
    },
  });
}

function validateRequestBody(body: unknown): SceneChatRequest | null {
  const parsed = SceneChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export async function handleSceneChatRequest(
  request: NextRequest,
  body: unknown,
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const parsed = validateRequestBody(body);
  if (!parsed) {
    return jsonError(400, "Invalid request payload.", "INVALID_REQUEST_PAYLOAD", requestId);
  }

  const user = await getCurrentUser();
  if (!user) {
    return jsonError(401, "Authentication required.", "UNAUTHENTICATED", requestId);
  }

  const [hasSceneAccess, canUseAi] = await Promise.all([
    canAccessScene(user.id, parsed.sceneId),
    canUseWorkspaceAI(user.id, parsed.workspaceId),
  ]);

  if (!hasSceneAccess) {
    return jsonError(403, "Scene access denied.", "SCENE_ACCESS_DENIED", requestId);
  }

  if (!canUseAi) {
    return jsonError(
      403,
      "AI is disabled or inaccessible for this workspace.",
      "WORKSPACE_AI_DISABLED",
      requestId,
    );
  }

  if ((parsed.mode === "mutate" || parsed.allowMutations) && !(await canEditScene(user.id, parsed.sceneId))) {
    return jsonError(
      403,
      "Scene mutation access denied.",
      "SCENE_MUTATION_ACCESS_DENIED",
      requestId,
    );
  }

  const rate = checkSceneChatRateLimit(`${user.id}:${parsed.workspaceId}`);
  if (!rate.allowed) {
    return jsonError(429, "Rate limit exceeded.", "SCENE_CHAT_RATE_LIMITED", requestId, {
      "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
    });
  }

  const stream = orchestrateSceneChat(
    {
      userId: user.id,
      workspaceId: parsed.workspaceId,
      sceneId: parsed.sceneId,
    },
    parsed,
  );

  return new Response(stream, {
    headers: {
      ...SCENE_CHAT_SSE_HEADERS,
      "x-notedraw-scene-chat": "v1",
      "x-request-id": requestId,
    },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    return handleSceneChatRequest(request, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown request error";
    const requestId = request.headers.get("x-request-id") || randomUUID();
    return jsonError(500, `Internal server error: ${message}`, "INTERNAL_SERVER_ERROR", requestId);
  }
}
