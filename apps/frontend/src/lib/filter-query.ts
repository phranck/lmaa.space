/** Active filter state for the shop list and category pages. */
export interface ShopFilters {
  city: string;
  radius: number;
  country: string[];
  region: string[];
}

/**
 * Serializes active shop filters to a URL query string.
 *
 * @param filters - Current filter state.
 * @returns URL-encoded query string (without leading `?`), or `""` if no filters are active.
 */
export function buildFilterQuery(filters: ShopFilters): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.city && filters.radius) params.set("radius", String(filters.radius));
  if (filters.country.length > 0) params.set("country", filters.country.join(","));
  if (filters.region.length > 0) params.set("region", filters.region.join(","));
  return params.toString();
}

/**
 * Builds a category page URL with the current filters encoded in the query string.
 *
 * @param slug - Category slug.
 * @param filters - Current filter state.
 * @returns Relative URL like `/category/mode?region=DE`.
 */
export function buildCategoryHref(slug: string, filters: ShopFilters): string {
  const query = buildFilterQuery(filters);
  return query ? `/category/${slug}?${query}` : `/category/${slug}`;
}

/**
 * Parses shop filter state from a URL's search parameters.
 *
 * @param url - The current page URL.
 * @returns `ShopFilters` with defaults applied for missing parameters.
 */
export function parseFiltersFromUrl(url: URL): ShopFilters {
  return {
    city: url.searchParams.get("city") ?? "",
    radius: Number(url.searchParams.get("radius")) || 50,
    country: url.searchParams.get("country")?.split(",").filter(Boolean) ?? [],
    region: url.searchParams.get("region")?.split(",").filter(Boolean) ?? [],
  };
}
