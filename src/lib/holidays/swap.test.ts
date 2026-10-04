import { describe, expect, it } from "vitest";
import {
  balance,
  createPlan,
  isTakenDate,
  isWorkedDate,
  removeDate,
  toggleTakenDate,
  toggleWorkedDate,
} from "./swap";

describe("toggleWorkedDate", () => {
  it("marks and unmarks a company holiday", () => {
    let plan = createPlan("hong_kong", "indonesian");
    plan = toggleWorkedDate(plan, "2026-10-19");

    expect(isWorkedDate(plan, "2026-10-19")).toBe(true);

    plan = toggleWorkedDate(plan, "2026-10-19");
    expect(isWorkedDate(plan, "2026-10-19")).toBe(false);
  });

  it("keeps the list sorted", () => {
    let plan = createPlan("hong_kong", "indonesian");
    plan = toggleWorkedDate(plan, "2026-12-25");
    plan = toggleWorkedDate(plan, "2026-02-17");

    expect(plan.workedDates).toEqual(["2026-02-17", "2026-12-25"]);
  });

  it("does not mutate the plan it was given", () => {
    const plan = createPlan("hong_kong", "indonesian");
    toggleWorkedDate(plan, "2026-10-19");

    expect(plan.workedDates).toEqual([]);
  });
});

describe("toggleTakenDate", () => {
  it("marks and unmarks a local holiday", () => {
    let plan = createPlan("hong_kong", "indonesian");
    plan = toggleTakenDate(plan, "2026-03-20");

    expect(isTakenDate(plan, "2026-03-20")).toBe(true);

    plan = toggleTakenDate(plan, "2026-03-20");
    expect(isTakenDate(plan, "2026-03-20")).toBe(false);
  });

  it("allows a date to be on the opposite side", () => {
    // The two lists are independent: nothing stops an employee from working
    // through one country's holiday and taking that same calendar date in the
    // other country, because they are different days off.
    let plan = createPlan("hong_kong", "indonesian");
    plan = toggleWorkedDate(plan, "2026-01-01");
    plan = toggleTakenDate(plan, "2026-01-01");

    expect(isWorkedDate(plan, "2026-01-01")).toBe(true);
    expect(isTakenDate(plan, "2026-01-01")).toBe(true);
  });
});

describe("balance", () => {
  it("is zero when both sides are empty", () => {
    expect(balance(createPlan("hong_kong", "indonesian"))).toBe(0);
  });

  it("is positive when the employee worked more days than they took", () => {
    let plan = createPlan("hong_kong", "indonesian");
    plan = toggleWorkedDate(plan, "2026-10-19");
    plan = toggleWorkedDate(plan, "2026-12-25");
    plan = toggleTakenDate(plan, "2026-03-20");

    expect(balance(plan)).toBe(1);
  });

  it("is negative when one worked day pays for two taken days", () => {
    // The case the uneven model exists for: the difference shows up as a deficit
    // the employee covers from their own leave allowance.
    let plan = createPlan("hong_kong", "indonesian");
    plan = toggleWorkedDate(plan, "2026-10-19");
    plan = toggleTakenDate(plan, "2026-03-20");
    plan = toggleTakenDate(plan, "2026-05-14");

    expect(balance(plan)).toBe(-1);
  });
});

describe("removeDate", () => {
  it("removes a date from whichever list holds it", () => {
    let plan = createPlan("hong_kong", "indonesian");
    plan = toggleWorkedDate(plan, "2026-10-19");
    plan = toggleTakenDate(plan, "2026-03-20");
    plan = removeDate(plan, "2026-10-19");

    expect(isWorkedDate(plan, "2026-10-19")).toBe(false);
    expect(isTakenDate(plan, "2026-03-20")).toBe(true);
  });

  it("is a no-op for a date that is not present", () => {
    const plan = createPlan("hong_kong", "indonesian");
    expect(removeDate(plan, "2026-10-19")).toEqual(plan);
  });
});
