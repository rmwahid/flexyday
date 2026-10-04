import type { SwapPlan } from "./types";

/**
 * Upper bound on how many dates one plan may hold on each side. A plan is loaded
 * from untrusted sources (an imported file or a share link) and the calendar does
 * per-day lookups, so oversized lists are rejected rather than rendered. A real
 * plan touches a handful of days per year, so this is generous.
 */
export const MAX_ENTRIES = 100;

/** Days earned minus days spent. Positive means days still owed to the employee,
 * negative means the employee covers the difference from their own leave. */
export function balance(plan: SwapPlan): number {
  return plan.workedDates.length - plan.takenDates.length;
}

export function createPlan(companyCountry: string, employeeCountry: string): SwapPlan {
  return { companyCountry, employeeCountry, workedDates: [], takenDates: [] };
}

export function isWorkedDate(plan: SwapPlan, date: string): boolean {
  return plan.workedDates.includes(date);
}

export function isTakenDate(plan: SwapPlan, date: string): boolean {
  return plan.takenDates.includes(date);
}

/** Toggles a company holiday between ordinary and worked through. */
export function toggleWorkedDate(plan: SwapPlan, date: string): SwapPlan {
  if (isWorkedDate(plan, date)) {
    return { ...plan, workedDates: plan.workedDates.filter((d) => d !== date) };
  }
  return { ...plan, workedDates: sortDates([...plan.workedDates, date]) };
}

/** Toggles a local holiday between ordinary and taken. */
export function toggleTakenDate(plan: SwapPlan, date: string): SwapPlan {
  if (isTakenDate(plan, date)) {
    return { ...plan, takenDates: plan.takenDates.filter((d) => d !== date) };
  }
  return { ...plan, takenDates: sortDates([...plan.takenDates, date]) };
}

export function removeDate(plan: SwapPlan, date: string): SwapPlan {
  return {
    ...plan,
    workedDates: plan.workedDates.filter((d) => d !== date),
    takenDates: plan.takenDates.filter((d) => d !== date),
  };
}

function sortDates(dates: string[]): string[] {
  return [...dates].sort((a, b) => a.localeCompare(b));
}
