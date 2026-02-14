type RateLimitState = {
  windowStartedAt: number;
  count: number;
};

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
};

const state = new Map<string, RateLimitState>();

const DEFAULT_WINDOW_MS = Number(
  process.env.AI_SCENE_CHAT_RATE_LIMIT_WINDOW_MS ?? 60_000,
);
const DEFAULT_MAX_REQUESTS = Number(
  process.env.AI_SCENE_CHAT_RATE_LIMIT_MAX ?? 20,
);

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
};

export function checkSceneChatRateLimit(
  key: string,
  options: RateLimitOptions = {},
): RateLimitResult {
  const windowMs = Math.max(1000, options.windowMs ?? DEFAULT_WINDOW_MS);
  const maxRequests = Math.max(1, options.maxRequests ?? DEFAULT_MAX_REQUESTS);

  const now = Date.now();
  const current = state.get(key);

  if (!current || now - current.windowStartedAt >= windowMs) {
    state.set(key, { windowStartedAt: now, count: 1 });
    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: maxRequests - 1,
    };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, windowMs - (now - current.windowStartedAt)),
      remaining: 0,
    };
  }

  current.count += 1;
  state.set(key, current);

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: Math.max(0, maxRequests - current.count),
  };
}
