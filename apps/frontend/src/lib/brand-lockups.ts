/**
 * How the brand lockups on the support page are drawn in Salon.
 *
 * The files in `src/assets/brands` stay exactly as their owners publish them,
 * and Papier shows them as they are. On Salon's dark cards their blue and black
 * would sink into the ground, so Salon shows a rendition of each file in white,
 * with PayPal's two blues as two greys under it. The rendition is derived from
 * the published file here rather than kept as a second file, so the two cannot
 * drift apart.
 */

/** The lockup's main color in Salon. */
const SALON_MARK = "#ffffff";

/**
 * PayPal's lighter blue in Salon: the "Pal" and the front P of the monogram,
 * which stand a step back from the white.
 */
const SALON_MARK_SECONDARY = "#b3b3b3";

/**
 * PayPal's darkest blue in Salon: where the two Ps of the monogram overlap,
 * darker than both, so they stay apart.
 */
const SALON_MARK_SHADOW = "#808080";

/** The brands that publish a lockup, as the page's routes name them. */
export type BrandLockupName = "github" | "paypal" | "sepa";

/**
 * Each color of a published lockup and the one Salon draws instead, written
 * exactly as the file writes it. A color left out stays, which is SEPA's
 * yellow euro.
 */
export const SALON_LOCKUP_COLORS: Record<BrandLockupName, Record<string, string>> = {
  github: { black: SALON_MARK },
  paypal: {
    "#003087": SALON_MARK,
    "#0070e0": SALON_MARK_SECONDARY,
    "#001c64": SALON_MARK_SHADOW,
  },
  sepa: { "rgb(13.72549%,31.372549%,66.27451%)": SALON_MARK },
};

/**
 * Redraws an SVG in other colors.
 *
 * @param svg - The SVG's text.
 * @param colors - Each color as the text writes it, and its replacement.
 * @returns The text with every occurrence of each color replaced.
 */
export function recolorSvg(svg: string, colors: Record<string, string>): string {
  return Object.entries(colors).reduce(
    (text, [published, replacement]) => text.replaceAll(published, replacement),
    svg,
  );
}

/**
 * The Salon rendition of a lockup, as an address an `img` element can show.
 *
 * A `data:` address, which the site's `img-src` admits, because the rendition
 * exists only in this module and has no file to point at.
 *
 * @param name - The brand.
 * @param svg - The published file's text.
 * @returns A `data:image/svg+xml` address of the rendition.
 */
export function salonLockupUrl(name: BrandLockupName, svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(recolorSvg(svg, SALON_LOCKUP_COLORS[name]))}`;
}
