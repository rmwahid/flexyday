import { describe, expect, it } from "vitest";
import { MAX_ENTRIES } from "./swap";
import { validateSharePayload, validateSwapPlan } from "./share";

const validPlan = {
  companyCountry: "hong_kong",
  employeeCountry: "indonesian",
  workedDates: ["2026-10-19", "2026-12-25"],
  takenDates: ["2026-03-20"],
};

const isoDay = (month: number, dayOffset: number) =>
  new Date(Date.UTC(2026, month - 1, 1 + dayOffset)).toISOString().slice(0, 10);

const manyDates = (count: number) =>
  Array.from({ length: count }, (_, index) => isoDay(1, index));

describe("validateSwapPlan", () => {
  it("accepts a well formed plan and sorts both lists", () => {
    const result = validateSwapPlan({
      ...validPlan,
      workedDates: ["2026-12-25", "2026-02-17"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workedDates).toEqual(["2026-02-17", "2026-12-25"]);
    expect(result.value.takenDates).toEqual(["2026-03-20"]);
  });

  it("accepts an uneven exchange", () => {
    // One worked day covering two taken days is the whole point of the model.
    const result = validateSwapPlan({
      ...validPlan,
      takenDates: ["2026-03-20", "2026-05-14"],
    });

    expect(result.ok).toBe(true);
  });

  it("accepts a plan with nothing marked yet", () => {
    const result = validateSwapPlan({
      companyCountry: "hong_kong",
      employeeCountry: "indonesian",
      workedDates: [],
      takenDates: [],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects anything that is not an object", () => {
    expect(validateSwapPlan(null).ok).toBe(false);
    expect(validateSwapPlan("nope").ok).toBe(false);
    expect(validateSwapPlan([]).ok).toBe(false);
  });

  it("rejects a country outside the supported list", () => {
    // This is the check that keeps a hand edited link from steering the server at
    // an arbitrary feed.
    const result = validateSwapPlan({ ...validPlan, companyCountry: "atlantis" });
    expect(result.ok).toBe(false);
  });

  it("rejects comparing a country with itself", () => {
    const result = validateSwapPlan({
      ...validPlan,
      companyCountry: "hong_kong",
      employeeCountry: "hong_kong",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid date", () => {
    const result = validateSwapPlan({ ...validPlan, workedDates: ["2026-02-30"] });
    expect(result.ok).toBe(false);
  });

  it("rejects a date listed twice on one side", () => {
    const result = validateSwapPlan({
      ...validPlan,
      workedDates: ["2026-10-19", "2026-10-19"],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a date that is both worked and taken", () => {
    const result = validateSwapPlan({
      ...validPlan,
      takenDates: ["2026-10-19"],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a list longer than the cap", () => {
    // A bounded list matters because the calendar does per-day lookups on it.
    // takenDates is emptied because the generated range would otherwise collide
    // with the sample plan's taken date, which the overlap rule rightly rejects.
    const capped = validateSwapPlan({
      ...validPlan,
      takenDates: [],
      workedDates: manyDates(MAX_ENTRIES),
    });
    const over = validateSwapPlan({
      ...validPlan,
      takenDates: [],
      workedDates: manyDates(MAX_ENTRIES + 1),
    });

    expect(capped.ok).toBe(true);
    expect(over.ok).toBe(false);
  });

  it("rejects a missing list", () => {
    const { takenDates: omitted, ...withoutTaken } = validPlan;
    expect(omitted).toBeDefined();
    expect(validateSwapPlan(withoutTaken).ok).toBe(false);
  });
});

describe("validateSharePayload", () => {
  it("accepts a plan without a name and stamps a creation time", () => {
    const result = validateSharePayload(validPlan);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.employeeName).toBeUndefined();
    expect(Number.isNaN(Date.parse(result.value.createdAt))).toBe(false);
  });

  it("keeps a supplied name and trims it", () => {
    const result = validateSharePayload({ ...validPlan, employeeName: "  Ahmad Dani  " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.employeeName).toBe("Ahmad Dani");
  });

  it("drops a name that is only whitespace", () => {
    const result = validateSharePayload({ ...validPlan, employeeName: "   " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.employeeName).toBeUndefined();
  });

  it("rejects an overlong name", () => {
    const result = validateSharePayload({ ...validPlan, employeeName: "a".repeat(500) });
    expect(result.ok).toBe(false);
  });

  it("rejects a name that is not text", () => {
    const result = validateSharePayload({ ...validPlan, employeeName: 42 });
    expect(result.ok).toBe(false);
  });

  it("still applies the plan checks", () => {
    const result = validateSharePayload({ ...validPlan, companyCountry: "atlantis" });
    expect(result.ok).toBe(false);
  });

  it("reports a message for every rejection", () => {
    const result = validateSharePayload({ ...validPlan, employeeCountry: "atlantis" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThan(0);
  });
});
