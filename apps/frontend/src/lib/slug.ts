/**
 * Converts a URL slug to a human-readable title.
 * e.g. "fair-fashion" → "Fair Fashion"
 */
export function slugToTitle(slug: string): string {
  const segments: string[] = [];

  for (const segment of slug.split("-")) {
    if (!segment) continue;
    segments.push(segment.charAt(0).toUpperCase() + segment.slice(1));
  }

  return segments.join(" ");
}
