export type ModelClientMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type StreamModelOptions = {
  model?: string;
  signal?: AbortSignal;
};

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export async function* streamModelTokens(
  messages: ModelClientMessage[],
  options: StreamModelOptions = {},
): AsyncGenerator<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const model = options.model ?? process.env.OPENROUTER_MODEL ?? "x-ai/grok-4.1-fast";

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Notedraw Scene Assistant",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Model request failed (${response.status}): ${body}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Model response did not include a readable stream.");
  }

  const decoder = new TextDecoder();
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
      if (!line.startsWith("data: ")) {
        continue;
      }

      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          yield token;
        }
      } catch {
        // Ignore malformed stream chunks.
      }
    }
  }
}
