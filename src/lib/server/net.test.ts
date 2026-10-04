import { describe, expect, it } from "vitest";
import { assertSafeFetchUrl, isPrivateOrReservedHost, UnsafeUrlError } from "./net";

const ALLOWED: ReadonlySet<string> = new Set(["calendar.google.com"]);

describe("isPrivateOrReservedHost", () => {
  it("rejects loopback and local hostnames", () => {
    expect(isPrivateOrReservedHost("localhost")).toBe(true);
    expect(isPrivateOrReservedHost("api.localhost")).toBe(true);
    expect(isPrivateOrReservedHost("printer.local")).toBe(true);
    expect(isPrivateOrReservedHost("")).toBe(true);
  });

  it("rejects private IPv4 ranges", () => {
    expect(isPrivateOrReservedHost("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedHost("10.1.2.3")).toBe(true);
    expect(isPrivateOrReservedHost("192.168.1.1")).toBe(true);
    expect(isPrivateOrReservedHost("172.16.0.1")).toBe(true);
    expect(isPrivateOrReservedHost("172.31.255.255")).toBe(true);
    expect(isPrivateOrReservedHost("100.64.0.1")).toBe(true);
    expect(isPrivateOrReservedHost("0.0.0.0")).toBe(true);
  });

  it("rejects link local, which is where cloud metadata endpoints live", () => {
    expect(isPrivateOrReservedHost("169.254.169.254")).toBe(true);
  });

  it("rejects multicast and reserved space", () => {
    expect(isPrivateOrReservedHost("224.0.0.1")).toBe(true);
    expect(isPrivateOrReservedHost("255.255.255.255")).toBe(true);
    expect(isPrivateOrReservedHost("198.18.0.1")).toBe(true);
  });

  it("rejects IPv6 loopback, link local and unique local", () => {
    expect(isPrivateOrReservedHost("::1")).toBe(true);
    expect(isPrivateOrReservedHost("::")).toBe(true);
    expect(isPrivateOrReservedHost("fe80::1")).toBe(true);
    expect(isPrivateOrReservedHost("fd00::1")).toBe(true);
  });

  it("rejects an IPv4 address hidden inside an IPv6 mapping", () => {
    expect(isPrivateOrReservedHost("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows ordinary public hosts and addresses", () => {
    expect(isPrivateOrReservedHost("calendar.google.com")).toBe(false);
    expect(isPrivateOrReservedHost("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedHost("172.32.0.1")).toBe(false);
  });
});

describe("assertSafeFetchUrl", () => {
  it("accepts an allowlisted https URL", () => {
    const url = assertSafeFetchUrl("https://calendar.google.com/x.ics", ALLOWED);
    expect(url.hostname).toBe("calendar.google.com");
  });

  it("rejects a scheme other than http or https", () => {
    expect(() => assertSafeFetchUrl("file:///etc/passwd", ALLOWED)).toThrow(UnsafeUrlError);
    expect(() => assertSafeFetchUrl("ftp://calendar.google.com/x", ALLOWED)).toThrow(
      UnsafeUrlError,
    );
  });

  it("rejects a host that is not on the allowlist", () => {
    expect(() => assertSafeFetchUrl("https://evil.example/x.ics", ALLOWED)).toThrow(
      UnsafeUrlError,
    );
  });

  it("rejects an allowlisted host reached through a private address", () => {
    // Defence in depth: even if a private host were added to the allowlist, the
    // address check still refuses it.
    expect(() => assertSafeFetchUrl("http://127.0.0.1/x", ALLOWED)).toThrow(UnsafeUrlError);
  });

  it("rejects credentials embedded in the URL", () => {
    expect(() =>
      assertSafeFetchUrl("https://user:pass@calendar.google.com/x.ics", ALLOWED),
    ).toThrow(UnsafeUrlError);
  });

  it("rejects something that is not a URL at all", () => {
    expect(() => assertSafeFetchUrl("not a url", ALLOWED)).toThrow(UnsafeUrlError);
  });
});
