/** Origin serving uploaded media and video. */
export const STORAGE_CSP_ORIGIN = "https://storage-prg1.zerops.io";

/** Origin embedding YouTube players without setting cookies. */
export const YOUTUBE_EMBED_CSP_ORIGIN = "https://www.youtube-nocookie.com";

/** Origin serving the analytics script and receiving its events. */
export const ANALYTICS_CSP_ORIGIN = "https://umami.layered.work";

/**
 * Rewrites `frame-ancestors` in an existing policy.
 *
 * @param policy - Policy as Astro emitted it.
 * @param frameAncestors - Source list the route should allow, for example an origin or `'none'`.
 * @returns The policy with `frame-ancestors` replaced, or extended with it when absent.
 *
 * @remarks
 * The policy is configured once in `astro.config.mjs`, which applies to every
 * route and therefore denies framing. The footer preview is the one route that
 * exists to be embedded by the dashboard, so its response needs a different
 * value. Rewriting the emitted policy keeps a single definition rather than a
 * second copy that has to be kept in step.
 */
export function withFrameAncestors(policy: string, frameAncestors: string): string {
  const directives = policy
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean);

  const rewritten = directives.map((directive) =>
    directive === "frame-ancestors" || directive.startsWith("frame-ancestors ")
      ? `frame-ancestors ${frameAncestors}`
      : directive,
  );

  if (!rewritten.some((directive) => directive.startsWith("frame-ancestors"))) {
    rewritten.push(`frame-ancestors ${frameAncestors}`);
  }

  return rewritten.join("; ");
}
