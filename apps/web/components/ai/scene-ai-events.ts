import {
  SceneChatResponseEventSchema,
  type SceneChatResponseEvent,
} from "@grovebox/ai-contracts";

const decoder = new TextDecoder();

const toEvent = (payload: string): SceneChatResponseEvent | null => {
  if (!payload || payload === "[DONE]") {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    const validated = SceneChatResponseEventSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    // Legacy compatibility: old route streamed `{ content: "..." }`.
    if (
      parsed &&
      typeof parsed === "object" &&
      "content" in parsed &&
      typeof (parsed as { content: unknown }).content === "string"
    ) {
      return {
        type: "token",
        content: (parsed as { content: string }).content,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export async function* streamSceneChatEvents(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SceneChatResponseEvent> {
  const reader = stream.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const payload = line.slice(5).trim();
      const event = toEvent(payload);
      if (event) {
        yield event;
      }
    }
  }

  if (buffer.trim().startsWith("data:")) {
    const payload = buffer.trim().slice(5).trim();
    const event = toEvent(payload);
    if (event) {
      yield event;
    }
  }
}
