import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  formatMonthYear,
  isValidIsoDate,
  parseIsoDate,
  toIsoDate,
  weekdayLabels,
} from "./dates";

describe("parseIsoDate", () => {
  it("parses a well formed date", () => {
    expect(parseIsoDate("2026-10-19")).toEqual({ year: 2026, month: 10, day: 19 });
  });

  it("rejects a date that would roll over", () => {
    // Without the round trip check this would silently become 2 March.
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(isValidIsoDate("2026-02-30")).toBe(false);
  });

  it("rejects out of range and badly padded values", () => {
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("2026-00-10")).toBeNull();
    expect(parseIsoDate("2026-1-1")).toBeNull();
    expect(parseIsoDate("2026/01/01")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });

  it("accepts a leap day only in a leap year", () => {
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
  });
});

describe("toIsoDate", () => {
  it("pads month and day", () => {
    expect(toIsoDate(2026, 1, 5)).toBe("2026-01-05");
  });
});

describe("buildMonthGrid", () => {
  it("starts on the Monday on or before the first of the month", () => {
    // 1 February 2026 is a Sunday, so the grid opens on Monday 26 January.
    const weeks = buildMonthGrid(2026, 2);
    expect(weeks[0][0].date).toBe("2026-01-26");
  });

  it("pads with neighbouring months and marks them", () => {
    const weeks = buildMonthGrid(2026, 2);
    const flat = weeks.flat();

    expect(flat[0].inMonth).toBe(false);
    expect(flat.find((cell) => cell.date === "2026-02-01")?.inMonth).toBe(true);
    expect(flat.find((cell) => cell.date === "2026-03-01")?.inMonth).toBe(false);
  });

  it("covers the whole month with complete weeks", () => {
    const weeks = buildMonthGrid(2026, 2);
    const flat = weeks.flat();
    const inMonth = flat.filter((cell) => cell.inMonth);

    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(inMonth[0].date).toBe("2026-02-01");
    expect(inMonth[inMonth.length - 1].date).toBe("2026-02-28");
  });

  it("handles a month that starts on a Monday without a leading gap", () => {
    // 1 June 2026 is a Monday.
    const weeks = buildMonthGrid(2026, 6);
    expect(weeks[0][0].date).toBe("2026-06-01");
  });
});

describe("formatting", () => {
  it("labels a Monday-first week", () => {
    const labels = weekdayLabels("en");
    expect(labels).toHaveLength(7);
    expect(labels[0].toLowerCase()).toContain("mon");
    expect(labels[6].toLowerCase()).toContain("sun");
  });

  it("names the month and year in the requested locale", () => {
    expect(formatMonthYear(2026, 2, "en")).toBe("February 2026");
    expect(formatMonthYear(2026, 2, "id")).toContain("2026");
  });
});
