/** The platforms a sponsor's picture can be looked up at, in the order tried. */
const LOOKUP_PLATFORMS = ["mastodon", "bluesky"] as const;

/**
 * The addresses a picture could be resolved from, as one comparable string.
 *
 * @param socialMedia - Platform keys against profile addresses.
 * @returns The addresses of the looked-up platforms, joined.
 */
export function lookupKey(socialMedia: Record<string, string>): string {
  return LOOKUP_PLATFORMS.map((platform) => socialMedia[platform] ?? "").join("|");
}

/**
 * Whether any address is present that a picture could be fetched from.
 *
 * @param socialMedia - Platform keys against profile addresses.
 * @returns `true` when at least one looked-up platform carries an address.
 */
export function canFetchPicture(socialMedia: Record<string, string>): boolean {
  return LOOKUP_PLATFORMS.some((platform) => Boolean(socialMedia[platform]));
}

/**
 * Whether entering this address is the moment to go and fetch a picture.
 *
 * The editor emits on every keystroke, so a half-typed address would otherwise
 * fire a request per character. It canonicalises the value on blur and blurs
 * itself on paste, which makes a complete address arrive as an `https` one.
 * That is the moment worth asking about, and asking twice about the same
 * address answers nothing new.
 *
 * @param socialMedia - Platform keys against profile addresses, as just edited.
 * @param lastKey - The key of the addresses the last lookup asked about.
 * @returns `true` when a lookup should run now.
 */
export function shouldFetchPicture(
  socialMedia: Record<string, string>,
  lastKey: string,
): boolean {
  if (lookupKey(socialMedia) === lastKey) return false;
  return LOOKUP_PLATFORMS.some((platform) => socialMedia[platform]?.startsWith("https://"));
}
