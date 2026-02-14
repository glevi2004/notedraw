export type McpToolCallResult = {
  ok: boolean;
  result?: unknown;
  error?: string;
};

type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: string;
  result: unknown;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  id: string;
  error: { code: number; message: string };
};

export async function callMcpTool(
  toolName: string,
  input: unknown,
  signal?: AbortSignal,
): Promise<McpToolCallResult> {
  const endpoint =
    process.env.MCP_SERVER_URL ??
    process.env.NEXT_PUBLIC_MCP_SERVER_URL ??
    "http://localhost:3001/mcp";

  const id = `tool_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: input,
        },
      }),
      signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `MCP call failed (${response.status})`,
      };
    }

    const payload = (await response.json()) as JsonRpcSuccess | JsonRpcError;

    if ("error" in payload) {
      return {
        ok: false,
        error: payload.error.message,
      };
    }

    return {
      ok: true,
      result: payload.result,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown MCP error",
    };
  }
}
