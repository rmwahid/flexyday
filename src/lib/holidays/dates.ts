/**
 * Date helpers built on plain `Date` and `Intl`, with no date library.
 *
 * Every date handled by the app is an all-day local date in `YYYY-MM-DD` form.
 * Arithmetic therefore goes through `Date.UTC` and reads back with the `getUTC*`
 * accessors, so the machine's timezone can never shift a holiday onto the wrong
 * day. Display formatting is delegated to `Intl`, which also supplies localized
 * month and weekday names for free.
 */

export interface IsoParts {
  year: number;
  month: number;
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses `YYYY-MM-DD`, returning null for anything malformed or impossible. */
export function parseIsoDate(value: string): IsoParts | null {
  const groups = value.match(ISO_DATE);
  if (!groups) return null;

  const year = Number(groups[1]);
  const month = Number(groups[2]);
  const day = Number(groups[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects dates that look plausible but roll over, such as 2026-02-30.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

export function toIsoDate(year: number, month: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function yearOf(value: string): string {
  return value.slice(0, 4);
}

export interface MonthCell {
  date: string;
  /** False for the padding days that belong to the neighbouring months. */
  inMonth: boolean;
}

/**
 * Builds the weeks for a month grid. Weeks start on Monday, matching ISO 8601 and
 * the common international convention. The grid is padded with the neighbouring
 * months' days so that every row is complete.
 */
export function buildMonthGrid(year: number, month: number): MonthCell[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));

  // getUTCDay is 0 for Sunday; shift so Monday is 0.
  const leading = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month - 1, 1 - leading));

  const weeks: MonthCell[][] = [];
  const cursor = new Date(start.getTime());

  while (cursor <= last || weeks.length === 0) {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i += 1) {
      const currentMonth = cursor.getUTCMonth() + 1;
      week.push({
        date: toIsoDate(
          cursor.getUTCFullYear(),
          currentMonth,
          cursor.getUTCDate(),
        ),
        inMonth: cursor.getUTCFullYear() === year && currentMonth === month,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

/** Weekday headings for a Monday-first grid, localized. */
export function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  // 2024-01-01 was a Monday, so this walks Monday through Sunday.
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(2024, 0, 1 + index))),
  );
}

export function formatMonthYear(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Full date for detail views and tooltips. */
export function formatFullDate(iso: string, locale: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}
