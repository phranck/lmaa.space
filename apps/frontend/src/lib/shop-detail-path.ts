import { encodeShopToken } from "@lmaa/shared";

/**
 * Builds the one canonical public path for a shop.
 *
 * @param slug - Persisted canonical shop slug returned by the public API.
 * @returns Absolute site path without an origin or query string.
 */
export function shopDetailPath(slug: string): string {
  return `/shop/${slug}`;
}

/**
 * Builds an unambiguous identifier path for a shop.
 *
 * @param id - Persisted numeric shop identifier.
 * @returns Namespaced public path that cannot collide with a readable slug.
 */
export function shopIdDetailPath(id: number): string {
  return `/shop/id/${encodeShopToken(id)}`;
}

/**
 * Decides whether an incoming shop identifier needs a permanent redirect.
 *
 * @param requestedIdentifier - Token, historical slug, or canonical slug from the route.
 * @param canonicalSlug - Current canonical slug returned with the shop.
 * @param search - Existing query string, including its leading `?` when present.
 * @returns Canonical path with preserved context, or `null` when already canonical.
 */
export function canonicalShopRedirectPath(
  requestedIdentifier: string,
  canonicalSlug: string,
  search: string,
): string | null {
  return requestedIdentifier === canonicalSlug ? null : `${shopDetailPath(canonicalSlug)}${search}`;
}
