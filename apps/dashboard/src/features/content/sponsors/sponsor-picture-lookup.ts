/**
 * The addresses a picture could be resolved from, as one comparable string.
 *
 * Every address counts, because the site answers for every one of them: a
 * handful of services through their own lookup, and all the rest by reading the
 * page for the picture it shows. Naming a few platforms here would be a second
 * list that has to be kept in step with that, and the last one drifted.
 *
 * @param socialMedia - Platform keys against profile addresses.
 * @returns The addresses, joined and in a stable order.
 */
export function lookupKey(socialMedia: Record<string, string>): string {
  return Object.entries(socialMedia)
    .filter(([, address]) => Boolean(address))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([platform, address]) => `${platform}=${address}`)
    .join("|");
}

/**
 * Whether any address is present that a picture could be fetched from.
 *
 * @param socialMedia - Platform keys against profile addresses.
 * @returns `true` when at least one address is there.
 */
export function canFetchPicture(socialMedia: Record<string, string>): boolean {
  return Object.values(socialMedia).some(Boolean);
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
  return Object.values(socialMedia).some((address) => address?.startsWith("https://"));
}
