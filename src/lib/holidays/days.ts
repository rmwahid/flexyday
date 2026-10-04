/**
 * Helpers for the unified calendar view: what a given day is, how lists are
 * ordered, and how lists are grouped for display.
 */

export type DayOrigin = "company" | "local" | "both" | "none";

/** Anything with a `has` lookup: a Set of dates, or a Map keyed by date. */
type DateLookup = { has(key: string): boolean };

export function dayOrigin(date: string, company: DateLookup, local: DateLookup): DayOrigin {
  const isCompany = company.has(date);
  const isLocal = local.has(date);
  if (isCompany && isLocal) return "both";
  if (isCompany) return "company";
  if (isLocal) return "local";
  return "none";
}

/**
 * Orders holidays chronologically, oldest first. Month grouping downstream
 * inherits the order, so lists rendered as months read forward in time; the
 * caller decides which range of days to offer in the first place.
 */
export function sortChronological<T extends { date: string }>(holidays: readonly T[]): T[] {
  return [...holidays].sort((a, b) => a.date.localeCompare(b.date));
}

/** Same ordering, for a plain list of dates. */
export function sortChronologicalDates(dates: readonly string[]): string[] {
  return [...dates].sort((a, b) => a.localeCompare(b));
}

/**
 * Groups holidays by calendar month, preserving the order they arrive in. Callers
 * sort the input first, which is what keeps the month headers in a sane order.
 */
export function groupByMonth<T extends { date: string }>(holidays: readonly T[]): [string, T[]][] {
  const byMonth = new Map<string, T[]>();
  for (const holiday of holidays) {
    const key = holiday.date.slice(0, 7);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(holiday);
    else byMonth.set(key, [holiday]);
  }
  return [...byMonth.entries()];
}
