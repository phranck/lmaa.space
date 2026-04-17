/**
 * European postal code recognition for the public search.
 *
 * Detects whether a free-text query looks like the beginning of a postal
 * code in any European country and returns a normalized prefix that can be
 * compared against `shop_headquarters.postal_code` with a prefix match.
 *
 * Normalization strips internal whitespace so that the query `"77716"` and a
 * stored value like `"77 716"` still match. Callers are expected to apply the
 * same strip on the database column (e.g. `REPLACE(postal_code, ' ', '')`).
 */

interface PostalPattern {
  /** Regex matching a full postal code (anchored, normalized form). */
  readonly full: RegExp;
  /** Regex matching any non-empty prefix of a full postal code. */
  readonly prefix: RegExp;
}

/**
 * Postal code patterns per ISO country for the European area.
 *
 * Patterns are evaluated against the normalized query (uppercase, with all
 * internal whitespace removed). The `prefix` variant allows a partial query
 * so that users can type the first few characters and still trigger a match.
 */
const POSTAL_PATTERNS: Record<string, PostalPattern> = {
  AT: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  BE: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  BG: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  BY: { full: /^\d{6}$/, prefix: /^\d{1,6}$/ },
  CH: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  CY: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  CZ: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  DE: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  DK: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  EE: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  ES: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  FI: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  FR: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  GB: {
    full: /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/,
    prefix: /^[A-Z](?:[A-Z]?\d(?:[A-Z\d]?(?:\d(?:[A-Z]{0,2})?)?)?)?$/,
  },
  GR: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  HR: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  HU: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  IE: {
    full: /^[A-Z]\d[A-Z\d][A-Z\d]{4}$/,
    prefix: /^[A-Z](?:\d(?:[A-Z\d](?:[A-Z\d]{0,4})?)?)?$/,
  },
  IS: { full: /^\d{3}$/, prefix: /^\d{1,3}$/ },
  IT: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  LI: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  LT: { full: /^LT\d{5}$/, prefix: /^L(?:T(?:\d{0,5})?)?$/ },
  LU: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  LV: { full: /^LV\d{4}$/, prefix: /^L(?:V(?:\d{0,4})?)?$/ },
  MC: { full: /^980\d{2}$/, prefix: /^9(?:8(?:0\d{0,2})?)?$/ },
  MD: { full: /^MD\d{4}$/, prefix: /^M(?:D(?:\d{0,4})?)?$/ },
  ME: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  MK: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  MT: { full: /^[A-Z]{3}\d{4}$/, prefix: /^[A-Z]{1,3}(?:\d{0,4})?$/ },
  NL: { full: /^\d{4}[A-Z]{2}$/, prefix: /^\d{1,4}(?:[A-Z]{0,2})?$/ },
  NO: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  PL: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  PT: { full: /^\d{7}$/, prefix: /^\d{1,7}$/ },
  RO: { full: /^\d{6}$/, prefix: /^\d{1,6}$/ },
  RS: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  RU: { full: /^\d{6}$/, prefix: /^\d{1,6}$/ },
  SE: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  SI: { full: /^\d{4}$/, prefix: /^\d{1,4}$/ },
  SK: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  SM: { full: /^4789\d$/, prefix: /^4(?:7(?:8(?:9\d?)?)?)?$/ },
  UA: { full: /^\d{5}$/, prefix: /^\d{1,5}$/ },
  VA: { full: /^00120$/, prefix: /^0(?:0(?:1(?:2(?:0)?)?)?)?$/ },
};

/**
 * Normalizes a free-text search query for postal-code comparison.
 *
 * Trims, uppercases, and strips all internal whitespace and hyphens so that
 * formats with separators (e.g. `"4050-067"` in Portugal, `"LV-1050"` in
 * Latvia, `"SW1A 1AA"` in the UK) collapse to a dense, uppercase token. The
 * returned value is compared both against {@link POSTAL_PATTERNS} and against
 * a database column normalized the same way (see `normalizedDbPostalCode`).
 *
 * @param query - Raw query string from the user.
 * @returns Normalized query, possibly empty.
 */
function normalizePostalQuery(query: string): string {
  return query.trim().toUpperCase().replace(/[\s-]+/g, "");
}

/**
 * Determines whether a query looks like the prefix of a European postal code.
 *
 * Returns the normalized prefix string that callers should pass to a database
 * prefix match, or `null` when the query cannot plausibly be a postal code in
 * any supported country. The heuristic requires at least one digit and a
 * minimum length of two characters, which rules out plain-word queries while
 * still accepting short numeric prefixes such as `"77"`.
 *
 * @param query - Raw query string from the user.
 * @returns Normalized prefix (uppercase, no whitespace, no hyphens) or `null`.
 */
export function extractEuropeanPostalCodePrefix(query: string): string | null {
  const normalized = normalizePostalQuery(query);
  if (normalized.length < 2) return null;
  if (!/\d/.test(normalized)) return null;
  for (const { prefix } of Object.values(POSTAL_PATTERNS)) {
    if (prefix.test(normalized)) {
      return normalized;
    }
  }
  return null;
}
