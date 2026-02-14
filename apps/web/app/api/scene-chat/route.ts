import { NextRequest } from "next/server";
import { handleSceneChatRequest } from "@/app/api/ai/scene-chat/route";
import { streamModelTokens, type ModelClientMessage } from "@/lib/ai/model-client";

const DEPRECATION_HEADERS = {
  "x-notedraw-deprecated": "true",
  "x-notedraw-deprecation-message": "Use /api/ai/scene-chat",
};

const LEGACY_SYSTEM_PROMPT = `You are a helpful AI assistant for Notedraw, a visual note-taking and diagramming application.
You help users understand, organize, and improve their diagrams and visual notes.
Be concise, helpful, and provide actionable suggestions when relevant.
If you don't know the answer, say so honestly.`;

type LegacyMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function toLegacyMessages(body: unknown): LegacyMessage[] {
  if (!body || typeof body !== "object") return [];
  const value = body as { messages?: unknown[] };
  if (!Array.isArray(value.messages)) return [];

  return value.messages
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const msg = message as { role?: unknown; content?: unknown };
      if (
        (msg.role !== "system" && msg.role !== "user" && msg.role !== "assistant") ||
        typeof msg.content !== "string"
      ) {
        return null;
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    })
    .filter((message): message is LegacyMessage => Boolean(message));
}

function hasNewRoutePayload(
  body: unknown,
): body is {
  workspaceId: string;
  sceneId: string;
  messages: { role: string; content: string }[];
  mode?: "chat" | "mutate";
  allowMutations?: boolean;
} {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return typeof value.workspaceId === "string" && typeof value.sceneId === "string";
}

function createLegacyStream(messages: LegacyMessage[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const modelMessages: ModelClientMessage[] = [
        { role: "system", content: LEGACY_SYSTEM_PROMPT },
        ...messages,
      ];

      try {
        for await (const token of streamModelTokens(modelMessages)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: token })}\n\n`));
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}

function mergeHeaders(base: HeadersInit): Headers {
  const headers = new Headers(base);
  for (const [key, value] of Object.entries(DEPRECATION_HEADERS)) {
    headers.set(key, value);
  }
  return headers;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (hasNewRoutePayload(body)) {
      const normalizedPayload = {
        ...body,
        mode: body.mode ?? "chat",
        allowMutations: body.allowMutations ?? false,
      };
      const response = await handleSceneChatRequest(request, normalizedPayload);
      return new Response(response.body, {
        status: response.status,
        headers: mergeHeaders(response.headers),
      });
    }

    const messages = toLegacyMessages(body);
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "Invalid request payload." }), {
        status: 400,
        headers: mergeHeaders({ "Content-Type": "application/json" }),
      });
    }

    const stream = createLegacyStream(messages);
    return new Response(stream, {
      headers: mergeHeaders({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown request error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: mergeHeaders({ "Content-Type": "application/json" }),
    });
  }
}
