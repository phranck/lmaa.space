export interface ShopFilters {
  city: string;
  radius: number;
  country: string[];
  region: string[];
}

export function buildFilterQuery(filters: ShopFilters): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.city && filters.radius) params.set("radius", String(filters.radius));
  if (filters.country.length > 0) params.set("country", filters.country.join(","));
  if (filters.region.length > 0) params.set("region", filters.region.join(","));
  return params.toString();
}

export function buildCategoryHref(slug: string, filters: ShopFilters): string {
  const query = buildFilterQuery(filters);
  return query ? `/category/${slug}?${query}` : `/category/${slug}`;
}

export function parseFiltersFromUrl(url: URL): ShopFilters {
  return {
    city: url.searchParams.get("city") ?? "",
    radius: Number(url.searchParams.get("radius")) || 50,
    country: url.searchParams.get("country")?.split(",").filter(Boolean) ?? [],
    region: url.searchParams.get("region")?.split(",").filter(Boolean) ?? [],
  };
}
