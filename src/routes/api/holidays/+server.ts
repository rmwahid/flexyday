import { json } from "@sveltejs/kit";
import { isSupportedCountry } from "$lib/holidays/countries";
import { loadHolidays } from "$lib/server/cache";
import type { RequestHandler } from "./$types";

/**
 * Returns the public holidays for one country.
 *
 * The full range the feed covers is returned in one response rather than a single
 * year, because the cache already holds all of it: switching year in the UI then
 * costs nothing instead of a round trip per year. The response also lists which
 * years are available so the client does not have to guess.
 *
 * The country is checked against the supported list before anything else happens,
 * so the value never travels any further than that check.
 */
export const GET: RequestHandler = async ({ url, platform }) => {
  const country = url.searchParams.get("country") ?? "";

  if (!isSupportedCountry(country)) {
    return json({ error: "That country is not supported." }, { status: 400 });
  }

  try {
    const set = await loadHolidays(country, { kv: platform?.env.FLEXYDAY_KV });
    const years = [...new Set(set.holidays.map((holiday) => holiday.date.slice(0, 4)))].sort();

    return json(
      {
        country: set.country,
        fetchedAt: set.fetchedAt,
        years,
        holidays: set.holidays,
      },
      { headers: { "cache-control": "public, max-age=3600" } },
    );
  } catch (error) {
    console.error(`Failed to load holidays for ${country}`, error);
    return json({ error: "The holiday source could not be reached." }, { status: 502 });
  }
};
