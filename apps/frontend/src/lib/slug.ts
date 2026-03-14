/**
 * Converts a URL slug to a human-readable title.
 * e.g. "fair-fashion" → "Fair Fashion"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
