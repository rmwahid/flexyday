/**
 * Minimal reader for the iCalendar format, scoped to what the holiday feeds
 * actually contain: a flat list of all-day events with no recurrence rules and no
 * timezone definitions. Written by hand rather than pulled in as a dependency
 * because the surface used here is small and the format is stable.
 *
 * Only the server reads or writes ICS, so this module lives under `$lib/server`
 * and SvelteKit will refuse to bundle it into client code.
 */

export interface RawIcsEvent {
  /** `YYYY-MM-DD`. Events without a date value are skipped by the parser. */
  date: string;
  summary: string;
  description: string;
}

/**
 * RFC 5545 folds long lines by inserting a CRLF followed by a single space or
 * tab. Unfolding has to happen before anything else, otherwise long descriptions
 * arrive truncated.
 */
function unfold(raw: string): string[] {
  return raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

/**
 * Reverses the text escaping described in RFC 5545 section 3.3.11. Done in a
 * single pass so an escaped backslash followed by an "n" stays two characters
 * instead of being mistaken for a newline.
 */
function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_whole, character: string) =>
    character === "n" || character === "N" ? "\n" : character,
  );
}

export function parseIcsEvents(raw: string): RawIcsEvent[] {
  const events: RawIcsEvent[] = [];
  let current: Partial<RawIcsEvent> | null = null;

  for (const line of unfold(raw)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
      if (current?.date && current.summary) {
        events.push({
          date: current.date,
          summary: current.summary,
          description: current.description ?? "",
        });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);

    if (key.startsWith("DTSTART")) {
      // All-day events carry `DTSTART;VALUE=DATE:YYYYMMDD`. Timed values are not
      // expected in these feeds and are ignored rather than guessed at.
      const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (match) current.date = `${match[1]}-${match[2]}-${match[3]}`;
    } else if (key === "SUMMARY") {
      current.summary = unescapeText(value);
    } else if (key === "DESCRIPTION") {
      current.description = unescapeText(value);
    }
  }

  return events;
}
