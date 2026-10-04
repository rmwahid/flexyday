import { describe, expect, it } from "vitest";
import { COUNTRIES } from "$lib/holidays/countries";
import { FEEDS, FEED_HOST, feedDefinition, feedUrl } from "./feeds";

describe("feed definitions", () => {
  it("has a feed for every country in the picker, and no extras", () => {
    // The two lists are derived from one another, so this guards against an entry
    // being added to the picker without a feed, or a feed being left behind after
    // a country is removed.
    const tokens = COUNTRIES.map((country) => country.token).sort();
    expect([...FEEDS.keys()].sort()).toEqual(tokens);
  });

  it("uses the official feed variant everywhere", () => {
    // The official variant contains public holidays only, which is what lets the
    // app skip filtering observances entirely. If a country ever needs a
    // non-official feed, that country needs the filtering back.
    for (const [token, definition] of FEEDS) {
      expect(definition.english, token).toMatch(/^en\..+\.official$/);
    }
  });

  it("only configures a native feed where a locale was verified", () => {
    for (const country of COUNTRIES) {
      const definition = feedDefinition(country.token);
      expect(definition).toBeDefined();
      if (!definition) continue;

      if (country.nativeLocale) {
        expect(definition.native, country.token).toBe(
          `${country.nativeLocale}.${country.token}.official`,
        );
      } else {
        expect(definition.native, country.token).toBeUndefined();
      }
    }
  });

  it("leaves Hong Kong without a native feed", () => {
    // Four Chinese locale feeds exist for Hong Kong and all of them return
    // English names, so no locale is worth fetching for it.
    expect(feedDefinition("hong_kong")?.native).toBeUndefined();
  });

  it("gives Indonesia both an English and an Indonesian feed", () => {
    expect(feedDefinition("indonesian")).toEqual({
      english: "en.indonesian.official",
      native: "id.indonesian.official",
    });
  });

  it("returns nothing for an unknown token", () => {
    expect(feedDefinition("atlantis")).toBeUndefined();
  });
});

describe("feedUrl", () => {
  it("points at the allowlisted host over https", () => {
    const url = new URL(feedUrl("en.hong_kong.official"));

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe(FEED_HOST);
  });

  it("encodes the calendar identifier so the hash is not read as a fragment", () => {
    // Left unencoded, everything after "#" would be a fragment and would never
    // reach the server.
    const url = feedUrl("en.hong_kong.official");

    expect(url).toContain("%23holiday%40group.v.calendar.google.com");
    expect(url).not.toContain("#");
  });

  it("ends in the ics path", () => {
    expect(feedUrl("en.hong_kong.official")).toMatch(/\/public\/basic\.ics$/);
  });
});
