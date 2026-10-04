import { describe, expect, it } from "vitest";
import { consumeRateLimit, type RateLimitStore } from "./rate-limit";

/** Minimal in-memory stand-in for KV; TTL cleanup is not needed by the logic. */
class FakeStore implements RateLimitStore {
  private items = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.items.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.items.set(key, value);
  }

  set(key: string, value: string): void {
    this.items.set(key, value);
  }

  size(): number {
    return this.items.size;
  }
}

const LIMIT = 3;
const WINDOW_SECONDS = 3600;
const T0 = Date.UTC(2026, 9, 4, 10, 0, 0);

describe("consumeRateLimit", () => {
  it("allows attempts below the limit", async () => {
    const store = new FakeStore();
    for (let i = 0; i < LIMIT; i += 1) {
      const decision = await consumeRateLimit(store, "k", LIMIT, WINDOW_SECONDS, T0);
      expect(decision.allowed).toBe(true);
    }
  });

  it("blocks once the window is full and reports the time to reset", async () => {
    const store = new FakeStore();
    for (let i = 0; i < LIMIT; i += 1) {
      await consumeRateLimit(store, "k", LIMIT, WINDOW_SECONDS, T0);
    }
    // Half an hour into the window, 30 minutes remain.
    const decision = await consumeRateLimit(store, "k", LIMIT, WINDOW_SECONDS, T0 + 30 * 60 * 1000);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(30 * 60);
  });

  it("starts a fresh window after the reset time passes", async () => {
    const store = new FakeStore();
    for (let i = 0; i < LIMIT; i += 1) {
      await consumeRateLimit(store, "k", LIMIT, WINDOW_SECONDS, T0);
    }
    const blocked = await consumeRateLimit(store, "k", LIMIT, WINDOW_SECONDS, T0);
    expect(blocked.allowed).toBe(false);

    const later = T0 + WINDOW_SECONDS * 1000 + 1;
    const fresh = await consumeRateLimit(store, "k", LIMIT, WINDOW_SECONDS, later);
    expect(fresh.allowed).toBe(true);
  });

  it("treats a corrupted counter as a fresh window", async () => {
    const store = new FakeStore();
    store.set("k", "not json at all");
    const decision = await consumeRateLimit(store, "k", LIMIT, WINDOW_SECONDS, T0);
    expect(decision.allowed).toBe(true);
  });

  it("keeps windows independent per key", async () => {
    const store = new FakeStore();
    for (let i = 0; i < LIMIT; i += 1) {
      await consumeRateLimit(store, "a", LIMIT, WINDOW_SECONDS, T0);
    }
    const other = await consumeRateLimit(store, "b", LIMIT, WINDOW_SECONDS, T0);
    expect(other.allowed).toBe(true);
    expect(store.size()).toBe(2);
  });
});
