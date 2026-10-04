import { describe, expect, it } from "vitest";
import { groupByMonth, sortChronological, sortChronologicalDates } from "./days";
import type { Holiday } from "./types";

function holiday(date: string): Holiday {
  return { country: "indonesian", date, name: date, kind: "public-holiday" };
}

describe("sortChronological", () => {
  it("orders by date oldest first", () => {
    const sorted = sortChronological([holiday("2027-05-01"), holiday("2026-01-02"), holiday("2026-03-04")]);
    expect(sorted.map((entry) => entry.date)).toEqual(["2026-01-02", "2026-03-04", "2027-05-01"]);
  });

  /**
   * The ordering this replaced put every future date first and then walked the past
   * backwards, which is what made the picker lists read 2026, 2027, 2025, 2021.
   */
  it("never reverses order around today", () => {
    const dates = ["2021-03-01", "2031-07-04", "2026-09-30", "2026-10-01", "2025-12-25"];
    expect(sortChronologicalDates(dates)).toEqual([
      "2021-03-01",
      "2025-12-25",
      "2026-09-30",
      "2026-10-01",
      "2031-07-04",
    ]);
  });

  it("does not mutate the input", () => {
    const input = [holiday("2026-02-02"), holiday("2026-01-01")];
    sortChronological(input);
    expect(input.map((entry) => entry.date)).toEqual(["2026-02-02", "2026-01-01"]);
  });
});

describe("groupByMonth", () => {
  it("keeps months in the order the caller supplied", () => {
    const groups = groupByMonth(
      sortChronological([holiday("2026-01-01"), holiday("2027-03-02"), holiday("2026-01-15")]),
    );
    expect(groups.map(([key]) => key)).toEqual(["2026-01", "2027-03"]);
    expect(groups[0][1].map((entry) => entry.date)).toEqual(["2026-01-01", "2026-01-15"]);
  });
});