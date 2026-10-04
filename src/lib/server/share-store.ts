import type { KVNamespace } from "@cloudflare/workers-types";
import { validateSharePayload } from "$lib/holidays/share";
import type { SharePayload } from "$lib/holidays/types";

/**
 * Share links live in KV under an unguessable identifier and expire on their own.
 *
 * Two properties are worth stating explicitly because they shape the design:
 *
 * 1. Expiry is real. The schedule is not encoded in the URL, so the server can
 *    genuinely stop serving it: KV deletes the key once the TTL passes, with no
 *    cron job and no cleanup pass.
 * 2. Links are read only. There is no update path anywhere in this module or in
 *    the API, so editing a schedule means creating a new link with a new
 *    identifier and leaving the old one untouched until it expires.
 */

const KEY_PREFIX = "share:v1:";
export const SHARE_TTL_SECONDS = 30 * 24 * 60 * 60;

// 32 symbols, with i, l, o and u removed so an identifier cannot be misread when
// it is copied by hand. 26 characters carry 128 bits of entropy.
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const ID_LENGTH = 26;
// Built from ID_LENGTH so the validator and the generator cannot drift apart.
const ID_PATTERN = new RegExp(`^[0-9a-hjkmnp-tv-z]{${ID_LENGTH}}$`);
const ID_BYTES = 16;

export class ShareStorageUnavailableError extends Error {}

export function isValidShareId(value: string): boolean {
  return ID_PATTERN.test(value);
}

/** 128 bits of randomness, encoded without modulo bias. */
function randomId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  crypto.getRandomValues(bytes);

  let out = "";
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(buffer >>> bits) & 31];
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) {
    out += ALPHABET[(buffer << (5 - bits)) & 31];
  }

  return out;
}

function shareKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function requireKv(kv: KVNamespace | undefined): KVNamespace {
  if (!kv) {
    throw new ShareStorageUnavailableError(
      "Share links need the FLEXYDAY_KV binding, which is not configured.",
    );
  }
  return kv;
}

export interface CreatedShare {
  id: string;
  expiresAt: string;
}

/**
 * Stores a schedule and returns its identifier. The payload is validated again
 * here, so a caller cannot write an unusable record even by mistake.
 */
export async function createShare(
  kv: KVNamespace | undefined,
  payload: unknown,
  now: Date = new Date(),
): Promise<CreatedShare> {
  const namespace = requireKv(kv);

  const validated = validateSharePayload(payload);
  if (!validated.ok) {
    throw new ShareStorageUnavailableError(validated.error);
  }

  const id = randomId();
  await namespace.put(shareKey(id), JSON.stringify(validated.value), {
    expirationTtl: SHARE_TTL_SECONDS,
  });

  return {
    id,
    expiresAt: new Date(now.getTime() + SHARE_TTL_SECONDS * 1000).toISOString(),
  };
}

/** Reads a schedule, or returns null when the identifier is unknown or expired. */
export async function readShare(
  kv: KVNamespace | undefined,
  id: string,
): Promise<SharePayload | null> {
  if (!isValidShareId(id)) return null;

  const namespace = requireKv(kv);
  const stored = await namespace.get<unknown>(shareKey(id), "json");
  if (stored === null) return null;

  // Re-validated on the way out as well. The record was checked before it was
  // written, but a read that trusts storage is how bad data becomes a bad render.
  const validated = validateSharePayload(stored);
  return validated.ok ? validated.value : null;
}
