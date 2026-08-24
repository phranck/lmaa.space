import type { SocialMediaLinks } from "@lmaa/shared";

/**
 * The addresses a picture could be resolved from, as one comparable string.
 *
 * Every address counts, because the site answers for every one of them: a
 * handful of services through their own lookup, and all the rest by reading the
 * page for the picture it shows. Naming a few platforms here would be a second
 * list that has to be kept in step with that, and the last one drifted.
 *
 * The order the addresses were entered in is part of the key, because it
 * decides which one is read first and a lookup made under a different order can
 * answer differently.
 *
 * @param socialMedia - The addresses as currently entered.
 * @returns The addresses, joined into one string.
 */
export function lookupKey(socialMedia: SocialMediaLinks): string {
  return socialMedia.flatMap(({ platform, url }) => (url ? [`${platform}=${url}`] : [])).join("|");
}

/**
 * Whether any address is present that a picture could be fetched from.
 *
 * @param socialMedia - The addresses as currently entered.
 * @returns `true` when at least one address is there.
 */
export function canFetchPicture(socialMedia: SocialMediaLinks): boolean {
  return socialMedia.some(({ url }) => Boolean(url));
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
 * @param socialMedia - The addresses, as just edited.
 * @param lastKey - The key of the addresses the last lookup asked about.
 * @returns `true` when a lookup should run now.
 */
export function shouldFetchPicture(socialMedia: SocialMediaLinks, lastKey: string): boolean {
  if (lookupKey(socialMedia) === lastKey) return false;
  return socialMedia.some(({ url }) => url?.startsWith("https://"));
}
