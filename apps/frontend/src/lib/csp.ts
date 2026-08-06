/** Origin serving uploaded media and video. */
export const STORAGE_CSP_ORIGIN = "https://storage-prg1.zerops.io";

/** Origin embedding YouTube players without setting cookies. */
export const YOUTUBE_EMBED_CSP_ORIGIN = "https://www.youtube-nocookie.com";

/** Origin serving the analytics script and receiving its events. */
export const ANALYTICS_CSP_ORIGIN = "https://umami.layered.work";

/**
 * Content Security Policy for the public website.
 *
 * @remarks
 * `script-src` names only origins this site actually loads code from. A general
 * purpose package CDN must never appear here: those serve any package to
 * anyone, so allowing one turns any injection into arbitrary script execution.
 *
 * `'unsafe-inline'` is still present because Astro emits inline scripts for
 * island hydration. Replacing it with per-request nonces or build-time hashes
 * is tracked separately, since it changes how every page is rendered and needs
 * verification in a browser.
 */
export const WEBSITE_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `frame-src 'self' ${YOUTUBE_EMBED_CSP_ORIGIN}`,
  `script-src 'self' 'unsafe-inline' ${ANALYTICS_CSP_ORIGIN}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${ANALYTICS_CSP_ORIGIN} ${STORAGE_CSP_ORIGIN}`,
  `media-src 'self' ${STORAGE_CSP_ORIGIN} blob:`,
  "form-action 'self'",
].join("; ");

/**
 * Builds the policy for the footer preview, which the dashboard embeds in a frame.
 *
 * @param dashboardOrigin - Origin allowed to frame the preview.
 * @returns The policy string for preview responses.
 *
 * @remarks
 * Differs from the website policy in exactly one way: `frame-ancestors` names
 * the dashboard instead of denying framing outright, because this route exists
 * to be embedded there.
 */
export function buildFooterPreviewCsp(dashboardOrigin: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `frame-ancestors ${dashboardOrigin}`,
    `script-src 'self' 'unsafe-inline' ${ANALYTICS_CSP_ORIGIN}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${ANALYTICS_CSP_ORIGIN} ${STORAGE_CSP_ORIGIN}`,
    `media-src 'self' ${STORAGE_CSP_ORIGIN} blob:`,
    "form-action 'self'",
  ].join("; ");
}
