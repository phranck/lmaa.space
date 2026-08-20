/** Origin serving uploaded media and video. */
export const STORAGE_CSP_ORIGIN = "https://storage-prg1.zerops.io";

/** Origin embedding YouTube players without setting cookies. */
export const YOUTUBE_EMBED_CSP_ORIGIN = "https://www.youtube-nocookie.com";

/** Origin serving the analytics script and receiving its events. */
export const ANALYTICS_CSP_ORIGIN = "https://umami.layered.work";

/** Address the analytics script is loaded from. */
export const ANALYTICS_SCRIPT_URL = `${ANALYTICS_CSP_ORIGIN}/script.js`;

/**
 * Integrity hash of the analytics script, so the browser refuses anything else.
 *
 * @remarks
 * The script runs with full access to every page: the DOM, the cookies that are
 * not `httpOnly`, and every form on screen. It comes from a host of its own
 * with its own deployment, and the policy admits that host under `script-src`,
 * which makes it the widest remaining grant on the site. The hash is what turns
 * "whatever that host returns" into "this exact file".
 *
 * It has to be renewed whenever that instance is updated, and a stale hash
 * stops analytics silently rather than loudly. `scripts/check-analytics-integrity.mjs`
 * exists so that shows up as a red run instead of as missing numbers nobody
 * looks for.
 */
export const ANALYTICS_SCRIPT_INTEGRITY =
  "sha384-BRaUFjOnCmWCc/Fzz6hqywS4clr0LbPdvb9WH1QuIhkfopGfKIhTn5OQBSc3ntfl";

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
