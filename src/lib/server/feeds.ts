import { COUNTRIES } from "$lib/holidays/countries";
import { assertSafeFetchUrl } from "./net";

/**
 * The country to calendar mapping. Derived from the single country list so an
 * entry cannot exist in the picker without a matching feed, or the other way
 * round.
 *
 * Every feed is the `.official` variant, which contains public holidays only and
 * therefore needs no filtering. The English feed is always fetched; the native
 * language feed is fetched only for countries where a locale was verified to
 * actually return different names.
 */

export const FEED_HOST = "calendar.google.com";
const ALLOWED_HOSTS: ReadonlySet<string> = new Set([FEED_HOST]);
const CALENDAR_SUFFIX = "#holiday@group.v.calendar.google.com";
const REQUEST_TIMEOUT_MS = 10_000;

export interface FeedDefinition {
  /** English feed, always present. */
  english: string;
  /** Native language feed, only where a locale was verified. */
  native?: string;
}

export const FEEDS: ReadonlyMap<string, FeedDefinition> = new Map(
  COUNTRIES.map((country) => [
    country.token,
    {
      english: `en.${country.token}.official`,
      ...(country.nativeLocale
        ? { native: `${country.nativeLocale}.${country.token}.official` }
        : {}),
    },
  ]),
);

export function feedDefinition(token: string): FeedDefinition | undefined {
  return FEEDS.get(token);
}

/** Builds the public ICS URL for a calendar identifier. */
export function feedUrl(calendarId: string): string {
  return `https://${FEED_HOST}/calendar/ical/${encodeURIComponent(calendarId + CALENDAR_SUFFIX)}/public/basic.ics`;
}

export class FeedError extends Error {}

/**
 * Downloads an ICS document. The URL is validated against the host allowlist and
 * the private-address rules before the request goes out, and the request is given
 * a timeout so a slow upstream cannot hold a Worker open indefinitely.
 */
export async function fetchIcs(url: string): Promise<string> {
  const safeUrl = assertSafeFetchUrl(url, ALLOWED_HOSTS);

  const response = await fetch(safeUrl, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: "text/calendar" },
  });

  if (!response.ok) {
    throw new FeedError(`Holiday feed request failed with status ${response.status}.`);
  }

  return response.text();
}
