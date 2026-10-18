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
