/**
 * Converts a region code (e.g. "DE", "AT", "EU") to its flag emoji.
 * Returns 🌍 for "WORLD".
 */
export function regionFlag(code: string): string {
  if (code.toUpperCase() === "WORLD") return "\u{1F30D}";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}
