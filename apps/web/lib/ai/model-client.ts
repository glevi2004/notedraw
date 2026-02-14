export type ModelClientMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type StreamModelOptions = {
  model?: string;
  signal?: AbortSignal;
};

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const resolveModel = (model?: string): string =>
  model ?? process.env.OPENROUTER_MODEL ?? "x-ai/grok-4.1-fast";

const buildHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  "X-Title": "Notedraw Scene Assistant",
});

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>;
};

export async function* streamModelTokens(
  messages: ModelClientMessage[],
  options: StreamModelOptions = {},
): AsyncGenerator<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const model = resolveModel(options.model);

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(apiKey),
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
        const parsed = JSON.parse(payload) as OpenRouterResponse;
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

type CompleteModelOptions = {
  model?: string;
  signal?: AbortSignal;
  temperature?: number;
};

export async function completeModelText(
  messages: ModelClientMessage[],
  options: CompleteModelOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const model = resolveModel(options.model);

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model,
      stream: false,
      messages,
      temperature: options.temperature ?? 0.1,
      response_format: {
        type: "json_object",
      },
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Model completion failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as OpenRouterResponse;
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}
