import { describe, expect, it } from "vitest";
import { parseIcsEvents } from "./ics";

/** Builds a minimal feed around the given event body. */
function feed(body: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Test//EN",
    "BEGIN:VEVENT",
    body,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

describe("parseIcsEvents", () => {
  it("reads an all-day event", () => {
    const events = parseIcsEvents(
      feed(
        ["DTSTART;VALUE=DATE:20261019", "SUMMARY:Chung Yeung Festival", "DESCRIPTION:Public holiday"].join(
          "\r\n",
        ),
      ),
    );

    expect(events).toEqual([
      {
        date: "2026-10-19",
        summary: "Chung Yeung Festival",
        description: "Public holiday",
      },
    ]);
  });

  it("unfolds lines that were wrapped by the producer", () => {
    // RFC 5545 wraps at 75 octets with a CRLF plus a single leading space, which
    // is removed when unfolding. The producer folds mid-token, so the pieces
    // have to rejoin without a gap.
    const raw = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260320",
      "SUMMARY:Cuti Bersama Idul Fitri",
      "DESCRIPTION:https://example.com/a/very/long/path",
      " /that/was/wrapped",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const [event] = parseIcsEvents(raw);
    expect(event.description).toBe("https://example.com/a/very/long/path/that/was/wrapped");
  });

  it("treats an escaped backslash followed by n as two characters, not a newline", () => {
    // A single-pass unescape is needed here: replacing \n before \\ would turn
    // the escaped backslash plus "n" into a newline.
    const events = parseIcsEvents(
      feed(["DTSTART;VALUE=DATE:20260101", "SUMMARY:path\\\\name"].join("\r\n")),
    );

    expect(events[0].summary).toBe("path\\name");
  });

  it("reverses escaped characters in text values", () => {
    const events = parseIcsEvents(
      feed(["DTSTART;VALUE=DATE:20260101", "SUMMARY:A\\, B\\; C", "DESCRIPTION:line1\\nline2"].join("\r\n")),
    );

    expect(events[0].summary).toBe("A, B; C");
    expect(events[0].description).toBe("line1\nline2");
  });

  it("skips events without a usable date or summary", () => {
    const raw = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:No date here",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260101",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    expect(parseIcsEvents(raw)).toEqual([]);
  });

  it("ignores timed values rather than guessing a date", () => {
    const events = parseIcsEvents(
      feed(["DTSTART:20260101T090000Z", "SUMMARY:Timed event"].join("\r\n")),
    );

    expect(events).toEqual([]);
  });

  it("returns an empty list for input that is not a calendar", () => {
    expect(parseIcsEvents("")).toEqual([]);
    expect(parseIcsEvents("not an ics file at all")).toEqual([]);
  });
});
