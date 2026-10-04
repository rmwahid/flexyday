/**
 * Dates are plain `YYYY-MM-DD` strings throughout this codebase. Every holiday is
 * an all-day local date with no time and no timezone attached, so keeping them as
 * strings avoids the classic off-by-one-day bugs that come from round tripping
 * through `Date` objects and UTC conversions.
 */

/** A national holiday, or an Indonesian-style joint leave day. */
export type HolidayKind = "public-holiday" | "joint-leave";

export interface Holiday {
  /** Country token used by the data source, for example `hong_kong`. */
  country: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** English name. Always present. */
  name: string;
  /**
   * Name in the country's own language. Only set when the source actually
   * provides a different name, which is verified per country rather than
   * assumed, because some countries expose a local language feed that still
   * returns English names.
   */
  nameNative?: string;
  kind: HolidayKind;
}

/** Holidays for one country, as cached and as returned by the API. */
export interface HolidaySet {
  country: string;
  /** ISO timestamp of when the source was last read. */
  fetchedAt: string;
  holidays: Holiday[];
}

/**
 * The swap schedule, held as two independent lists rather than pairs.
 *
 * Working through a company holiday earns a day; taking a local holiday spends
 * one. Keeping them separate is what allows an uneven exchange, for example one
 * worked day paying for two taken days, with the difference surfaced as a balance
 * the employee covers from their own leave allowance.
 */
export interface SwapPlan {
  companyCountry: string;
  employeeCountry: string;
  /** Company-country holidays the employee works through. These earn days. */
  workedDates: string[];
  /** Employee-country holidays taken instead. These spend days. */
  takenDates: string[];
}

/** A swap plan as stored behind a share link. */
export interface SharePayload extends SwapPlan {
  /** Optional, and deliberately not filled in by default because anyone holding
   * the link can read it. */
  employeeName?: string;
  /** ISO timestamp of when the link was created. */
  createdAt: string;
}
