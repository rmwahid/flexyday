import { describe, expect, it } from "vitest";
import { buildCalendar, escapeIcsText, foldLine } from "./ics-export";

const bytes = (value: string) => new TextEncoder().encode(value).length;
const NOW = new Date("2026-09-30T02:00:00Z");

describe("escapeIcsText", () => {
  it("escapes the reserved characters", () => {
    expect(escapeIcsText("A, B; C")).toBe("A\\, B\\; C");
    expect(escapeIcsText("back\\slash")).toBe("back\\\\slash");
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2");
  });
});

describe("foldLine", () => {
  it("leaves a short line alone", () => {
    const line = "SUMMARY:short";
    expect(foldLine(line)).toBe(line);
  });

  it("folds a long line within the 75 octet limit", () => {
    const folded = foldLine(`SUMMARY:${"a".repeat(200)}`);
    for (const line of folded.split("\r\n")) {
      expect(bytes(line)).toBeLessThanOrEqual(75);
    }
  });

  it("never splits a multi-byte character", () => {
    // The limit is in octets, so folding has to count bytes while cutting on
    // character boundaries, otherwise UTF-8 sequences are broken.
    const folded = foldLine(`SUMMARY:${"重陽節".repeat(40)}`);
    const unfolded = folded.replace(/\r\n[ \t]/g, "");

    expect(unfolded).toBe(`SUMMARY:${"重陽節".repeat(40)}`);
    for (const line of folded.split("\r\n")) {
      expect(bytes(line)).toBeLessThanOrEqual(75);
    }
  });
});

describe("buildCalendar", () => {
  const calendar = buildCalendar(
    [
      {
        uid: "worked-2026-10-19@flexyday",
        date: "2026-10-19",
        summary: "Working: Chung Yeung Festival",
        description: "Company holiday worked through; a local holiday was taken instead.",
      },
    ],
    { now: NOW },
  );

  it("uses CRLF line endings and closes the calendar", () => {
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(calendar).toContain("\r\n");
    expect(calendar.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });

  it("writes an all-day event", () => {
    expect(calendar).toContain("DTSTART;VALUE=DATE:20261019");
    expect(calendar).toContain("DTEND;VALUE=DATE:20261020");
  });

  it("stamps the supplied time", () => {
    expect(calendar).toContain("DTSTAMP:20260930T020000Z");
  });

  it("includes the identifier", () => {
    expect(calendar).toContain("UID:worked-2026-10-19@flexyday");
  });

  it("keeps every line within the octet limit once folded", () => {
    const long = buildCalendar(
      [
        {
          uid: "x@flexyday",
          date: "2026-10-19",
          summary: "A rather long summary ".repeat(10),
        },
      ],
      { now: NOW },
    );

    for (const line of long.split("\r\n")) {
      expect(bytes(line)).toBeLessThanOrEqual(75);
    }
  });

  it("rolls the exclusive end date across a year boundary", () => {
    const one = buildCalendar(
      [{ uid: "x@flexyday", date: "2026-12-31", summary: "New Year's Eve shift" }],
      { now: NOW },
    );

    expect(one).toContain("DTEND;VALUE=DATE:20270101");
  });

  it("omits the description when there is none", () => {
    const one = buildCalendar(
      [{ uid: "x@flexyday", date: "2026-10-19", summary: "Shift" }],
      { now: NOW },
    );

    expect(one).not.toContain("DESCRIPTION:");
  });

  it("produces an empty but valid calendar for no events", () => {
    const empty = buildCalendar([], { now: NOW });
    expect(empty).toContain("BEGIN:VCALENDAR");
    expect(empty).toContain("END:VCALENDAR");
    expect(empty).not.toContain("BEGIN:VEVENT");
  });

  it("round trips a folded summary back to the original text", () => {
    const summary = "Working: Hari Ulang Tahun Kemerdekaan Republik Indonesia ".repeat(3).trim();
    const one = buildCalendar([{ uid: "x@flexyday", date: "2026-08-17", summary }], { now: NOW });
    const unfolded = one.replace(/\r\n[ \t]/g, "");

    expect(unfolded).toContain(`SUMMARY:${summary}`);
  });
});
