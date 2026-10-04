import { describe, expect, it } from "vitest";
import type { RawIcsEvent } from "./ics";
import { holidayKind, attachNativeNames, holidaysInYear, toHolidays } from "./normalize";

const event = (date: string, summary: string): RawIcsEvent => ({
  date,
  summary,
  description: "Public holiday",
});

describe("holidayKind", () => {
  it("marks Indonesian joint leave and the English equivalent", () => {
    expect(holidayKind("Cuti Bersama Idul Fitri")).toBe("joint-leave");
    expect(holidayKind("Cuti Bersama Natal (Malam Natal)")).toBe("joint-leave");
  });

  it("finds the English marker wherever it sits in the name", () => {
    // The English feed writes the marker at the end for the Chinese New Year
    // entry. An earlier version anchored the match to the start of the string and
    // silently classified that one as an ordinary holiday.
    expect(holidayKind("Chinese New Year Joint Holiday")).toBe("joint-leave");
    expect(holidayKind("Joint Holiday for Good Friday")).toBe("joint-leave");
    expect(holidayKind("Joint Holiday for Bali's Day of Silence")).toBe("joint-leave");
  });

  it("treats everything else as a public holiday", () => {
    expect(holidayKind("Hari Raya Natal")).toBe("public-holiday");
    expect(holidayKind("Chung Yeung Festival")).toBe("public-holiday");
    expect(holidayKind("New Year's Day")).toBe("public-holiday");
  });
});

describe("toHolidays", () => {
  it("sorts by date and keeps one entry per day", () => {
    const holidays = toHolidays("hong_kong", [
      event("2026-10-19", "Day off for Chung Yeung Festival"),
      event("2026-01-01", "New Year's Day"),
      event("2026-10-18", "Chung Yeung Festival"),
    ]);

    expect(holidays.map((holiday) => holiday.date)).toEqual([
      "2026-01-01",
      "2026-10-18",
      "2026-10-19",
    ]);
  });

  it("keeps the first entry when two events share a date", () => {
    // Google's Hong Kong feed lists the festival day first and the following day
    // off second on the rare dates where both exist, and the substantive holiday
    // is the one worth showing.
    const holidays = toHolidays("hong_kong", [
      event("2026-04-06", "Tomb Sweeping Day"),
      event("2026-04-06", "Day off for Tomb Sweeping Day"),
    ]);

    expect(holidays).toHaveLength(1);
    expect(holidays[0].name).toBe("Tomb Sweeping Day");
  });

  it("keeps every year the feed contains", () => {
    const holidays = toHolidays("indonesian", [
      event("2026-01-01", "Hari Tahun Baru"),
      event("2027-01-01", "Hari Tahun Baru"),
    ]);

    expect(holidays).toHaveLength(2);
    expect(holidaysInYear(holidays, "2027")).toHaveLength(1);
  });
});

describe("attachNativeNames", () => {
  it("attaches the native name when it differs", () => {
    const holidays = toHolidays("indonesian", [event("2026-01-01", "New Year's Day")]);
    const merged = attachNativeNames(holidays, [event("2026-01-01", "Hari Tahun Baru")]);

    expect(merged[0].name).toBe("New Year's Day");
    expect(merged[0].nameNative).toBe("Hari Tahun Baru");
  });

  it("leaves the native name unset when the feed returns English anyway", () => {
    // This is the Hong Kong case: four Chinese locale feeds exist and all of them
    // return English names, so the merge must not store a duplicate.
    const holidays = toHolidays("hong_kong", [event("2026-10-19", "Chung Yeung Festival")]);
    const merged = attachNativeNames(holidays, [event("2026-10-19", "Chung Yeung Festival")]);

    expect(merged[0].nameNative).toBeUndefined();
    expect(Object.keys(merged[0])).not.toContain("nameNative");
  });

  it("ignores native dates that the English feed does not have", () => {
    const holidays = toHolidays("indonesian", [event("2026-01-01", "New Year's Day")]);
    const merged = attachNativeNames(holidays, [
      event("2026-01-01", "Hari Tahun Baru"),
      event("2026-08-17", "Hari Kemerdekaan"),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].date).toBe("2026-01-01");
  });
});

describe("holidaysInYear", () => {
  it("filters by the year prefix and nothing else", () => {
    const holidays = toHolidays("indonesian", [
      event("2026-01-01", "A"),
      event("2027-01-01", "B"),
    ]);

    expect(holidaysInYear(holidays, "2026").map((h) => h.name)).toEqual(["A"]);
    expect(holidaysInYear(holidays, "1999")).toEqual([]);
  });
});
