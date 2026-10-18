import { decodeShopToken } from "./shop-token.js";
import { slugify } from "./slug.js";

/** Maximum persisted shop-slug length accepted by the public route. */
export const SHOP_SLUG_MAX_LENGTH = 80;

/** Pattern shared by route validation and persisted shop-slug generation. */
export const SHOP_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Reports whether a candidate belongs to the legacy Sqid namespace.
 *
 * Reserving every decodable value guarantees that a current or future token
 * URL can never be shadowed by a human-readable slug.
 *
 * @param candidate - Normalized lowercase slug candidate.
 * @returns `true` when the value decodes to a valid shop identifier.
 */
export function isReservedShopSlug(candidate: string): boolean {
  return decodeShopToken(candidate) !== null;
}

/**
 * Allocates a bounded human-readable shop slug from a display name.
 *
 * The first candidate is the normalized name with a trailing common domain
 * suffix removed. Subsequent candidates receive a numeric suffix beginning at
 * `-2`. Empty normalized names use `shop-page`, and
 * values in the Sqid namespace are treated as occupied even when no shop uses
 * that token yet.
 *
 * @param name - Current public shop name.
 * @param unavailable - Canonical and historical slugs owned by other shops.
 * @returns The first deterministic candidate outside both unavailable sets.
 */
export function allocateShopSlug(name: string, unavailable: ReadonlySet<string>): string {
  const readableName = name.trim().replace(/\.(?:at|ch|com|de|eu|net|org)$/i, "");
  const normalized = slugify(readableName) || "shop-page";
  const base = normalized.slice(0, SHOP_SLUG_MAX_LENGTH).replace(/-+$/g, "") || "shop-page";

  for (let number = 1; ; number += 1) {
    const suffix = number === 1 ? "" : `-${number}`;
    const stem =
      base.slice(0, SHOP_SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, "") || "shop-page";
    const candidate = `${stem}${suffix}`;
    if (!unavailable.has(candidate) && !isReservedShopSlug(candidate)) return candidate;
  }
}
