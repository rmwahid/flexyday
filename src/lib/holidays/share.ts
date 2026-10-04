import { isSupportedCountry } from "./countries";
import { isValidIsoDate } from "./dates";
import { MAX_ENTRIES } from "./swap";
import type { SharePayload, SwapPlan } from "./types";

/**
 * Validation for data that arrives from outside the app: the payload behind a
 * share link, and an imported file. Both are editable by hand by whoever has
 * them, so neither can be trusted to have a sensible shape, valid country codes,
 * or a bounded number of entries. Everything is checked before use, and the API
 * runs the same checks before storing a link.
 */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDateList(value: unknown, label: string): ValidationResult<string[]> {
  if (!Array.isArray(value)) {
    return { ok: false, error: `The ${label} list is missing.` };
  }
  if (value.length > MAX_ENTRIES) {
    return { ok: false, error: `At most ${MAX_ENTRIES} dates are allowed per list.` };
  }

  const dates: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !isValidIsoDate(entry)) {
      return { ok: false, error: `The ${label} list contains an invalid date.` };
    }
    dates.push(entry);
  }

  if (new Set(dates).size !== dates.length) {
    return { ok: false, error: `The ${label} list contains a date twice.` };
  }

  return { ok: true, value: dates.sort((a, b) => a.localeCompare(b)) };
}

export function validateSwapPlan(input: unknown): ValidationResult<SwapPlan> {
  if (!isRecord(input)) {
    return { ok: false, error: "The plan is not an object." };
  }

  const { companyCountry, employeeCountry, workedDates, takenDates } = input;

  if (typeof companyCountry !== "string" || !isSupportedCountry(companyCountry)) {
    return { ok: false, error: "The company country is not supported." };
  }
  if (typeof employeeCountry !== "string" || !isSupportedCountry(employeeCountry)) {
    return { ok: false, error: "The employee country is not supported." };
  }
  if (companyCountry === employeeCountry) {
    return { ok: false, error: "Pick two different countries to compare." };
  }

  const worked = validateDateList(workedDates, "worked days");
  if (!worked.ok) return worked;

  const taken = validateDateList(takenDates, "taken days");
  if (!taken.ok) return taken;

  const overlap = worked.value.filter((date) => taken.value.includes(date));
  if (overlap.length > 0) {
    return { ok: false, error: "A date cannot be worked and taken at the same time." };
  }

  return {
    ok: true,
    value: {
      companyCountry,
      employeeCountry,
      workedDates: worked.value,
      takenDates: taken.value,
    },
  };
}

export function validateSharePayload(input: unknown): ValidationResult<SharePayload> {
  const plan = validateSwapPlan(input);
  if (!plan.ok) return plan;

  if (!isRecord(input)) {
    return { ok: false, error: "The shared plan is not an object." };
  }

  const { employeeName, createdAt } = input;
  const payload: SharePayload = {
    ...plan.value,
    createdAt: typeof createdAt === "string" ? createdAt : new Date().toISOString(),
  };

  if (employeeName !== undefined) {
    if (typeof employeeName !== "string" || employeeName.length > MAX_NAME_LENGTH) {
      return { ok: false, error: "The name is too long or not text." };
    }
    const trimmed = employeeName.trim();
    if (trimmed.length > 0) payload.employeeName = trimmed;
  }

  return { ok: true, value: payload };
}
