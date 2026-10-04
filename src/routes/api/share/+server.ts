import { json } from "@sveltejs/kit";
import { consumeRateLimit } from "$lib/server/rate-limit";
import { createShare, ShareStorageUnavailableError } from "$lib/server/share-store";
import type { RequestHandler } from "./$types";

/**
 * Attempts allowed per client address per fixed one-hour window. Generous for a
 * real person creating links by hand, tight enough to stop scripted abuse of
 * the KV write budget. Attempts are counted before validation on purpose: an
 * endpoint that only counts successes is still free to probe.
 */
const SHARE_RATE_LIMIT = { limit: 20, windowSeconds: 3600 };

/**
 * The counter key hashes the client address instead of storing it verbatim.
 * The limiter only needs to tell callers apart, not to remember who they are.
 */
async function clientKey(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const hex = [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `ratelimit:share:${hex}`;
}

/**
 * Stores a swap schedule and returns a link to it.
 *
 * The endpoint only creates. There is no update or delete counterpart, which is
 * what makes links read only by construction: an edit in the UI produces a new
 * link and leaves the old one alone until it expires.
 */
export const POST: RequestHandler = async ({ request, platform, url }) => {
  const kv = platform?.env.FLEXYDAY_KV;
  // Cloudflare sets CF-Connecting-IP on every production request. When it is
  // absent (local development without the header) the limiter is skipped
  // rather than keyed on a guessed address.
  const ip = request.headers.get("cf-connecting-ip");
  if (kv && ip) {
    const decision = await consumeRateLimit(
      kv,
      await clientKey(ip),
      SHARE_RATE_LIMIT.limit,
      SHARE_RATE_LIMIT.windowSeconds,
    );
    if (!decision.allowed) {
      const minutes = Math.max(1, Math.ceil((decision.retryAfterSeconds ?? 0) / 60));
      return json(
        {
          error: `Too many share links were created from this connection recently. Try again in about ${minutes} minute(s).`,
        },
        { status: 429, headers: { "retry-after": String(decision.retryAfterSeconds ?? 60) } },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The request body is not valid JSON." }, { status: 400 });
  }

  try {
    const created = await createShare(kv, body);
    return json(
      {
        id: created.id,
        url: `${url.origin}/s/${created.id}`,
        expiresAt: created.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ShareStorageUnavailableError) {
      // Covers both a missing binding and a payload that failed validation. The
      // message from the store already says which.
      return json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to create share link", error);
    return json({ error: "The link could not be created." }, { status: 500 });
  }
};
