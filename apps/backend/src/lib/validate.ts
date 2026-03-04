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

/** Check that a URL points to an external (non-private) host. */
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
