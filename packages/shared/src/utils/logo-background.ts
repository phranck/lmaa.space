/** Default logo background color used when no shop-specific color is set. */
export const DEFAULT_LOGO_BACKGROUND = "#fafaf9";

/**
 * Resolves a shop's logo background color, falling back to the default
 * when no explicit color was set. Total function — always returns a valid hex.
 */
export function resolveLogoBackground(color: string | null | undefined): string {
  return color && color.length > 0 ? color : DEFAULT_LOGO_BACKGROUND;
}
