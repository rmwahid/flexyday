/**
 * A fixed-window rate limiter backed by the app's KV namespace.
 *
 * KV is eventually consistent, so under concurrent requests handled by
 * different edge locations a window can overshoot slightly. That is accepted:
 * this is a guard against scripted abuse of the KV write budget and the share
 * endpoint, not an exact meter, and it avoids adding Durable Objects to the
 * stack for a small tool.
 */

/**
 * The subset of `KVNamespace` the limiter uses, declared structurally so tests
 * can pass a plain in-memory fake.
 */
export interface RateLimitStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the window resets; only set when the request is blocked. */
  retryAfterSeconds?: number;
}

interface Window {
  count: number;
  resetAt: number;
}

// KV rejects expirationTtl values below 60 seconds.
const MIN_TTL_SECONDS = 60;

/**
 * Counts one attempt against the window stored at `key` and decides whether it
 * may proceed. The window is identified by the caller (for the share endpoint,
 * a hash of the client address), so this function never sees an address itself.
 */
export async function consumeRateLimit(
  store: RateLimitStore,
  key: string,
  limit: number,
  windowSeconds: number,
  now: number = Date.now(),
): Promise<RateLimitDecision> {
  const raw = await store.get(key);
  let window: Window | null = null;

  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as Partial<Window>;
      if (typeof parsed.count === "number" && typeof parsed.resetAt === "number") {
        window = { count: parsed.count, resetAt: parsed.resetAt };
      }
    } catch {
      // A malformed counter is treated as absent; the write below repairs it.
    }
  }

  if (window && window.resetAt > now && window.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + windowSeconds * 1000 };
  }
  window.count += 1;

  const ttlSeconds = Math.max(MIN_TTL_SECONDS, Math.ceil((window.resetAt - now) / 1000));
  await store.put(key, JSON.stringify(window), { expirationTtl: ttlSeconds });

  return { allowed: true };
}
