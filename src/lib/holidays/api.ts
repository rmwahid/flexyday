import type { Holiday, SharePayload } from "./types";

/**
 * Thin wrappers over the app's own API. Kept in one place so the pages deal with
 * typed results and short error messages rather than raw responses.
 */

export interface HolidayResponse {
  country: string;
  fetchedAt: string;
  years: string[];
  holidays: Holiday[];
}

export interface CreatedShare {
  id: string;
  url: string;
  expiresAt: string;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `${fallback} (${response.status})`;
}

export async function fetchHolidays(
  country: string,
  signal?: AbortSignal,
): Promise<HolidayResponse> {
  const response = await fetch(`/api/holidays?country=${encodeURIComponent(country)}`, { signal });
  if (!response.ok) {
    throw new Error(await readError(response, "The holiday list could not be loaded"));
  }
  return (await response.json()) as HolidayResponse;
}

export async function createShareLink(payload: SharePayload): Promise<CreatedShare> {
  const response = await fetch("/api/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "The link could not be created"));
  }
  return (await response.json()) as CreatedShare;
}
