import {
  SceneChatResponseEventSchema,
  type SceneChatResponseEvent,
} from "@grovebox/ai-contracts";

const encoder = new TextEncoder();

export const SCENE_CHAT_SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

export function streamSceneChatEvents(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: SceneChatResponseEvent,
): void {
  const parsed = SceneChatResponseEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Invalid scene chat event payload: ${parsed.error.message}`);
  }

  controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed.data)}\n\n`));
}

export function streamSceneChatComment(
  controller: ReadableStreamDefaultController<Uint8Array>,
  comment: string,
): void {
  controller.enqueue(encoder.encode(`: ${comment}\n\n`));
}
