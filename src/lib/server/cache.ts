import type { Holiday, HolidaySet } from "$lib/holidays/types";
import type { KVNamespace } from "@cloudflare/workers-types";
import { FEEDS, feedDefinition, feedUrl, fetchIcs } from "./feeds";
import { parseIcsEvents, type RawIcsEvent } from "./ics";
import { attachNativeNames, toHolidays } from "./normalize";

/**
 * Lazy holiday cache.
 *
 * A country's holidays are fetched the first time somebody asks for them and then
 * kept in KV, so the common request never leaves Cloudflare. A cached entry is
 * served as is until it goes stale; only then is the upstream read again, and the
 * result is compared by content hash so an unchanged feed does not cause a
 * rewrite.
 *
 * There is deliberately no scheduler. Cron triggers are a Workers feature and are
 * not available to Pages projects, and adding one would mean a second deployment
 * to keep the calendar current. Refresh on demand does the job instead, and
 * holiday data changes only a few times a year.
 */

const KEY_PREFIX = "holidays:v1:";
const FRESH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Bump this whenever the shape of a holiday or the rules that produce it change.
 * A stored entry carries the version it was written with and is ignored when it
 * does not match, so a change to the normalization logic takes effect
 * immediately instead of being masked by up to a month of cached output. Version
 * 2 corrected how joint leave days are recognised.
 */
const CACHE_VERSION = 2;

interface CacheEntry {
  version: number;
  contentHash: string;
  fetchedAt: string;
  holidays: Holiday[];
}

export interface LoadOptions {
  kv?: KVNamespace;
  /** Injectable so staleness can be tested without waiting. */
  now?: Date;
  /** Skips the freshness check, for a forced refresh. */
  forceRefresh?: boolean;
}

function cacheKey(token: string): string {
  return `${KEY_PREFIX}${token}`;
}

async function contentHash(parts: readonly string[]): Promise<string> {
  const bytes = new TextEncoder().encode(parts.join("\u0000"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class UnsupportedCountryError extends Error {}

/** Reads both feeds for a country and merges them into one holiday list. */
async function loadFromSource(token: string): Promise<{ holidays: Holiday[]; hash: string }> {
  const definition = feedDefinition(token);
  if (!definition) {
    throw new UnsupportedCountryError(`No holiday feed is configured for "${token}".`);
  }

  const englishRaw = await fetchIcs(feedUrl(definition.english));
  let nativeRaw = "";

  if (definition.native) {
    try {
      nativeRaw = await fetchIcs(feedUrl(definition.native));
    } catch {
      // A missing native feed is not fatal: the English names are still correct,
      // just less familiar. Better to serve the calendar than to fail the request.
      nativeRaw = "";
    }
  }

  const englishEvents: RawIcsEvent[] = parseIcsEvents(englishRaw);
  const nativeEvents: RawIcsEvent[] = nativeRaw ? parseIcsEvents(nativeRaw) : [];

  const holidays = attachNativeNames(toHolidays(token, englishEvents), nativeEvents);

  return { holidays, hash: await contentHash([englishRaw, nativeRaw]) };
}

function isFresh(entry: CacheEntry, now: Date): boolean {
  const fetchedAt = Date.parse(entry.fetchedAt);
  if (Number.isNaN(fetchedAt)) return false;
  return now.getTime() - fetchedAt < FRESH_MS;
}

/** An entry written by a different version of the normalizer cannot be reused. */
function isUsable(entry: CacheEntry | null): entry is CacheEntry {
  return entry !== null && entry.version === CACHE_VERSION && Array.isArray(entry.holidays);
}

export async function loadHolidays(token: string, options: LoadOptions = {}): Promise<HolidaySet> {
  const { kv, now = new Date(), forceRefresh = false } = options;

  let cached: CacheEntry | null = null;
  if (kv) {
    const stored = await kv.get<CacheEntry>(cacheKey(token), "json");
    cached = isUsable(stored) ? stored : null;
  }

  if (cached && !forceRefresh && isFresh(cached, now)) {
    return { country: token, fetchedAt: cached.fetchedAt, holidays: cached.holidays };
  }

  const { holidays, hash } = await loadFromSource(token);
  const fetchedAt = now.toISOString();

  // The feed is unchanged, so keep the stored holidays and only move the
  // freshness marker forward. This keeps KV writes rare.
  if (cached && cached.contentHash === hash) {
    if (kv) {
      await kv.put(cacheKey(token), JSON.stringify({ ...cached, fetchedAt }));
    }
    return { country: token, fetchedAt, holidays: cached.holidays };
  }

  const entry: CacheEntry = {
    version: CACHE_VERSION,
    contentHash: hash,
    fetchedAt,
    holidays,
  };
  if (kv) {
    await kv.put(cacheKey(token), JSON.stringify(entry));
  }

  return { country: token, fetchedAt, holidays };
}

/** Exposed for tests and diagnostics. */
export function supportedTokens(): string[] {
  return [...FEEDS.keys()];
}
