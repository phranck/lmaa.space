import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Detect image type from magic bytes. Returns null if not a recognized image. */
export function detectImageType(buffer: Buffer): "jpeg" | "png" | "webp" | "gif" | "avif" | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
    return "png";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
    return "webp";
  // GIF: "GIF8"
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38)
    return "gif";
  // AVIF: bytes 4-7 = "ftyp", bytes 8-11 = "avif" or "avis"
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
    if (brand === "avif" || brand === "avis") return "avif";
  }
  return null;
}

/** Parse and validate a route parameter as a positive integer ID. */
export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Check that a URL points to an external (non-private) host (lexical pre-check). */
export function isExternalUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return false;
    const bare = hostname.replace(/^\[|]$/g, "");
    if (bare === "localhost" || bare === "127.0.0.1" || bare === "::1" || bare === "0.0.0.0")
      return false;
    // Private IPv4 ranges
    if (/^10\./.test(bare)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(bare)) return false;
    if (/^192\.168\./.test(bare)) return false;
    // Link-local + cloud metadata
    if (/^169\.254\./.test(bare)) return false;
    // Private IPv6 ranges (ULA fc00::/7, link-local fe80::/10)
    if (/^f[cd]/i.test(bare)) return false;
    if (/^fe[89ab]/i.test(bare)) return false;
    // Internal hostnames
    if (bare.endsWith(".internal") || bare.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether a canonical numeric IP address (IPv4 or IPv6) belongs to a
 * private, loopback, link-local, unique-local, CGNAT or otherwise reserved
 * range that must never be reached from a server-side fetch.
 *
 * @param ip - IP address string in canonical form (as returned by `dns.lookup`).
 * @returns `true` when the address is private/reserved and must be blocked.
 *
 * @remarks
 * Fails closed: non-IP input returns `true`. IPv4-mapped IPv6
 * (`::ffff:a.b.c.d`) is unwrapped and evaluated as IPv4 so an attacker cannot
 * smuggle a private v4 address through the v6 form.
 */
export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return true;
  if (family === 4) return isPrivateIpv4(ip.split(".").map(Number));

  const bytes = ipv6ToBytes(ip);
  if (!bytes) return true; // unparseable IPv6 → fail closed

  // Any IPv6 carrying an IPv4 in its low 32 bits: IPv4-mapped (`::ffff:x` — which
  // WHATWG `URL` normalises to the hex form `::ffff:7f00:1`, so it MUST be matched
  // by value, not by a dotted-decimal regex), NAT64 (`64:ff9b::/96`), or `::/96`
  // (incl. `::`, `::1`, deprecated IPv4-compatible). Evaluate the embedded IPv4.
  const isMapped =
    bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  const isNat64 = bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b;
  const isLowEmbedded = bytes.slice(0, 12).every((b) => b === 0);
  if (isMapped || isNat64 || isLowEmbedded) return isPrivateIpv4(bytes.slice(12));

  // Pure IPv6 reserved ranges.
  if ((bytes[0] & 0xfe) === 0xfc) return true; // unique-local fc00::/7
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // link-local fe80::/10
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return true; // 6to4 2002::/16
  if (bytes[0] === 0x01 && bytes.slice(1, 8).every((b) => b === 0)) return true; // discard 100::/64
  return false;
}

/** Tests an IPv4 octet tuple against private/loopback/link-local/CGNAT/reserved ranges. */
function isPrivateIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true; // this-host, private, loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (RFC 6598)
  return false;
}

/**
 * Expands any valid IPv6 string (including an embedded trailing IPv4) into its
 * 16 octets, so reserved ranges can be checked by value regardless of textual
 * encoding (compressed `::`, hex IPv4-mapped, dotted IPv4-mapped, etc.).
 *
 * @param ip - IPv6 address string (already known to be a valid IPv6 literal).
 * @returns The 16 octets, or `null` when the input cannot be parsed.
 */
function ipv6ToBytes(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const embeddedV4 = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embeddedV4) {
    const o = embeddedV4[1].split(".").map(Number);
    if (o.some((n) => n > 255)) return null;
    const hi = ((o[0] << 8) | o[1]).toString(16);
    const lo = ((o[2] << 8) | o[3]).toString(16);
    s = `${s.slice(0, s.length - embeddedV4[1].length)}${hi}:${lo}`;
  }
  const parts = s.split("::");
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  const fill = parts.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  if (groups.length !== 8) return null;
  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    const value = Number.parseInt(group, 16);
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }
  return bytes;
}

/**
 * Resolves a hostname via DNS and verifies every resolved address is public.
 *
 * @param hostname - Host component of a URL (surrounding IPv6 brackets stripped).
 * @returns `true` only when the host resolves and all addresses are public.
 *
 * @remarks
 * This is the real SSRF defence: it defeats DNS-rebinding and alternative IP
 * encodings (decimal/octal/hex/IPv4-mapped) that the lexical {@link isExternalUrl}
 * check misses, because `getaddrinfo` normalises every form to a canonical IP.
 * Fails closed on resolution error, empty result, or any private address. A
 * residual TOCTOU gap remains between this check and the actual connection;
 * closing it fully would require pinning the socket to the validated address.
 */
async function resolvesToPublicHost(hostname: string): Promise<boolean> {
  const bare = hostname.replace(/^\[|]$/g, "");
  if (isIP(bare) !== 0) return !isPrivateIp(bare);
  try {
    const records = await lookup(bare, { all: true });
    return records.length > 0 && records.every((record) => !isPrivateIp(record.address));
  } catch {
    return false;
  }
}

/**
 * Full SSRF guard for server-side fetches: validates the URL scheme and
 * confirms the host resolves only to public addresses.
 *
 * @param url - Absolute URL to validate before fetching.
 * @param options - `httpsOnly` rejects `http:` targets (default `false`).
 * @returns `true` when the URL is safe to fetch from the backend.
 */
export async function isPublicFetchTarget(
  url: string,
  options: { httpsOnly?: boolean } = {},
): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (options.httpsOnly) {
    if (parsed.protocol !== "https:") return false;
  } else if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  if (!isExternalUrl(url)) return false;
  return resolvesToPublicHost(parsed.hostname);
}
