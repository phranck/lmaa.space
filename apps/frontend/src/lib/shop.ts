/**
 * Extracts the display domain from a shop URL.
 *
 * @param url - Raw shop URL.
 * @returns Hostname without `www.` or the original input when parsing fails.
 */
export function shopDomain(url: string): string {
  // Extract host directly from the raw string to preserve Unicode/IDN characters.
  // new URL().hostname would convert e.g. "kaffeerösterei-cochem.de" → Punycode.
  const match = url.match(/^https?:\/\/(?:www\.)?([^/?#:]+)/i);
  if (match) return match[1];
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Adds the `ref=lmaa.space` tracking query param to outbound shop links.
 *
 * @param url - Raw shop URL.
 * @returns Updated URL or original input when parsing fails.
 */
export function shopRefUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("ref", "lmaa.space");
    return u.toString();
  } catch {
    return url;
  }
}
