import type { Holiday, HolidayKind } from "$lib/holidays/types";
import type { RawIcsEvent } from "./ics";

/**
 * Joint leave days are a distinct kind of day off from a national holiday. The
 * marker is not in a fixed position: the Indonesian feed prefixes with "Cuti
 * Bersama", while the English feed appends "Joint Holiday" or writes "Joint
 * Holiday for ...", so the match has to look anywhere in the name.
 */
export function holidayKind(name: string): HolidayKind {
  return /cuti bersama|joint holiday/i.test(name) ? "joint-leave" : "public-holiday";
}

/**
 * Shapes raw events into holidays, across every year the feed contains. Filtering
 * to a single year happens at the API boundary, because the cache keeps the full
 * range so the UI can change year without another upstream request.
 *
 * The feeds used here are the `.official` variants, which contain public holidays
 * only, so observances need no filtering. `normalize.test.ts` guards that
 * assumption.
 */
export function toHolidays(country: string, events: readonly RawIcsEvent[]): Holiday[] {
  const byDate = new Map<string, Holiday>();

  for (const event of events) {
    // Two events can share a date, for example a festival day and the day off
    // that follows it. The first one wins, and the feeds list the substantive
    // holiday first.
    if (byDate.has(event.date)) continue;
    byDate.set(event.date, {
      country,
      date: event.date,
      name: event.summary,
      kind: holidayKind(event.summary),
    });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Adds names from a second feed in the country's own language.
 *
 * The pairing is done by date, which is safe because a locale feed for the same
 * country describes the same set of days; only the wording differs. A name is
 * only attached when it actually differs from the English one, so a feed that
 * silently returns English (Hong Kong has four Chinese locales that do exactly
 * that) leaves `nameNative` unset instead of duplicating the same string.
 */
export function attachNativeNames(
  holidays: readonly Holiday[],
  nativeEvents: readonly RawIcsEvent[],
): Holiday[] {
  const nativeByDate = new Map<string, string>();
  for (const event of nativeEvents) {
    if (!nativeByDate.has(event.date)) nativeByDate.set(event.date, event.summary);
  }

  return holidays.map((holiday) => {
    const native = nativeByDate.get(holiday.date);
    if (!native || native === holiday.name) return holiday;
    return { ...holiday, nameNative: native };
  });
}

export function holidaysInYear(holidays: readonly Holiday[], year: string): Holiday[] {
  return holidays.filter((holiday) => holiday.date.startsWith(`${year}-`));
}
