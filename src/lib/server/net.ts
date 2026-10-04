/**
 * Guard for every outbound request the server makes.
 *
 * Nothing fetched by this app is user supplied: country tokens are mapped to
 * calendar identifiers through a fixed allowlist, so the request target can never
 * be attacker controlled. This module is defence in depth for that: it enforces
 * the scheme, enforces the host allowlist, and refuses addresses that point at
 * the local machine, the private network, or reserved ranges. If a host is ever
 * added to the allowlist, those checks still apply.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isIpv6(host: string): boolean {
  return host.includes(":");
}

/** True for addresses and names that must never be reachable from the server. */
export function isPrivateOrReservedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (host === "" || host === "localhost" || host === "0.0.0.0") return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  if (isIpv6(host)) {
    // Loopback, unspecified, IPv4-mapped, unique local, and link local.
    if (host === "::" || host === "::1") return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    if (host.startsWith("fe80")) return true;
    if (host.startsWith("::ffff:")) return isPrivateOrReservedHost(host.slice(7));
    return false;
  }

  if (!isIpv4(host)) return false;

  const [a, b] = host.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;

  return false;
}

export class UnsafeUrlError extends Error {}

/**
 * Validates a URL before any request is made, and returns it once it is known to
 * be safe. Throws `UnsafeUrlError` otherwise.
 */
export function assertSafeFetchUrl(raw: string, allowedHosts: ReadonlySet<string>): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError(`Not a valid URL: ${raw}`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError(`Unsupported protocol: ${url.protocol}`);
  }
  if (url.username !== "" || url.password !== "") {
    throw new UnsafeUrlError("Credentials in the URL are not allowed.");
  }
  if (isPrivateOrReservedHost(url.hostname)) {
    throw new UnsafeUrlError(`Refusing to fetch a private or reserved host: ${url.hostname}`);
  }
  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    throw new UnsafeUrlError(`Host is not on the allowlist: ${url.hostname}`);
  }

  return url;
}
