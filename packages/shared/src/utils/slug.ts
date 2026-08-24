/**
 * Slugs, written the one way this project writes them.
 *
 * German umlauts are transliterated rather than dropped, so `Über uns` becomes
 * `ueber-uns` rather than `ber-uns`. Everything that is not a lowercase letter
 * or a digit collapses into a single hyphen, and the result carries no hyphen
 * at either end.
 */

/** Umlauts and the sharp s, in the order they are replaced. */
const TRANSLITERATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ä/g, "ae"],
  [/ö/g, "oe"],
  [/ü/g, "ue"],
  [/ß/g, "ss"],
];

/**
 * Lowercases the text and writes the German letters out.
 *
 * @param value - Free text, in any case.
 * @returns The text in lowercase, with `ä`, `ö`, `ü` and `ß` spelled out.
 */
function transliterate(value: string): string {
  let result = value.toLowerCase();
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Turns free text into a slug fit for a URL.
 *
 * @param value - Free text, such as a page title or a category name.
 * @returns The slug, as `ueber-uns`. Empty when the text held nothing that
 *   survives the transliteration.
 */
export function slugify(value: string): string {
  return transliterate(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Turns free text into a slug whilst somebody is still typing it.
 *
 * Hyphens already in the field are kept, including a trailing one, because
 * {@link slugify} would remove the hyphen a person has just typed and the next
 * character would then have nothing to attach to.
 *
 * @param value - The current contents of the field.
 * @returns The slug, which may open or close with a hyphen.
 */
export function slugifyInput(value: string): string {
  return transliterate(value).replace(/[^a-z0-9-]+/g, "-");
}
