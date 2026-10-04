import { parseIsoDate, toIsoDate } from "./dates";

/**
 * Builds an iCalendar file so a swap schedule can be imported into a real
 * calendar (Google Calendar, Outlook, Apple Calendar).
 *
 * Written by hand because the format needed here is small: all-day events only,
 * no recurrence, no alarms, no timezones. The details that actually matter for
 * interoperability are handled explicitly: CRLF line endings, escaping of the
 * characters RFC 5545 reserves, line folding at 75 octets, and an exclusive
 * DTEND, which is always the day after DTSTART for an all-day event.
 *
 * The export is one way by design. A calendar client cannot reconstruct the swap
 * model from these events, so JSON remains the format for round tripping.
 */

export interface IcsEventInput {
  /** Stable identifier. Must be unique within the file. */
  uid: string;
  /** `YYYY-MM-DD`. */
  date: string;
  summary: string;
  description?: string;
}

export interface BuildCalendarOptions {
  productId?: string;
  /** Injectable so tests do not depend on the clock. */
  now?: Date;
}

const DEFAULT_PRODUCT_ID = "-//FlexyDay//Holiday Swap//EN";

/** Escapes the characters RFC 5545 section 3.3.11 gives special meaning. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds a content line to 75 octets as required by RFC 5545, continuing onto the
 * next line with a leading space. Folding counts bytes rather than characters and
 * never splits a multi-byte character, so non-Latin holiday names survive intact.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;

  for (const character of line) {
    const size = encoder.encode(character).length;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      // Continuation lines start with a space, which counts toward the 75 octets.
      limit = 74;
      current += " ";
      currentBytes = 1;
    }
    current += character;
    currentBytes += size;
  }
  parts.push(current);

  return parts.join("\r\n");
}

function formatTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** All-day DTEND is exclusive, so it is always the following day. */
function nextDay(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

export function buildCalendar(
  events: readonly IcsEventInput[],
  options: BuildCalendarOptions = {},
): string {
  const stamp = formatTimestamp(options.now ?? new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${options.productId ?? DEFAULT_PRODUCT_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(event.date))}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
