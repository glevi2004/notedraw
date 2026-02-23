/**
 * Simple in-process rate limiter for API routes.
 *
 * Uses a sliding window algorithm keyed by an arbitrary string (e.g. userId or IP).
 * This is intentionally per-process: in a multi-instance deployment each instance
 * enforces its own limit. For stricter global limits, replace with Upstash Redis.
 *
 * Pre-configured limiters (all configurable via environment variables):
 *   RATE_LIMIT_SCENE_SAVE_MAX / RATE_LIMIT_SCENE_SAVE_WINDOW_MS
 *   RATE_LIMIT_SHARE_CREATE_MAX / RATE_LIMIT_SHARE_CREATE_WINDOW_MS
 *   RATE_LIMIT_SHARE_READ_MAX / RATE_LIMIT_SHARE_READ_WINDOW_MS
 */

type WindowState = {
  windowStartedAt: number;
  count: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Remaining requests in the current window (0 if denied). */
  remaining: number;
  /** Milliseconds until the window resets (0 if allowed). */
  retryAfterMs: number;
};

function createLimiter(
  defaultMax: number,
  defaultWindowMs: number,
  envMax?: string,
  envWindow?: string,
) {
  const max = Number(envMax ?? defaultMax);
  const windowMs = Number(envWindow ?? defaultWindowMs);
  const state = new Map<string, WindowState>();

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const current = state.get(key);

    if (!current || now - current.windowStartedAt >= windowMs) {
      state.set(key, { windowStartedAt: now, count: 1 });
      return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
    }

    if (current.count >= max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, windowMs - (now - current.windowStartedAt)),
      };
    }

    current.count += 1;
    state.set(key, current);
    return { allowed: true, remaining: max - current.count, retryAfterMs: 0 };
  };
}

/** 60 saves / minute per user */
export const checkSceneSaveRateLimit = createLimiter(
  60,
  60_000,
  process.env.RATE_LIMIT_SCENE_SAVE_MAX,
  process.env.RATE_LIMIT_SCENE_SAVE_WINDOW_MS,
);

/** 10 share creates / minute per user */
export const checkShareCreateRateLimit = createLimiter(
  10,
  60_000,
  process.env.RATE_LIMIT_SHARE_CREATE_MAX,
  process.env.RATE_LIMIT_SHARE_CREATE_WINDOW_MS,
);

/** 200 public share reads / minute per IP */
export const checkShareReadRateLimit = createLimiter(
  200,
  60_000,
  process.env.RATE_LIMIT_SHARE_READ_MAX,
  process.env.RATE_LIMIT_SHARE_READ_WINDOW_MS,
);
