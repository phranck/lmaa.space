/** Origin serving uploaded media and video. */
export const STORAGE_CSP_ORIGIN = "https://storage-prg1.zerops.io";

/** Origin embedding YouTube players without setting cookies. */
export const YOUTUBE_EMBED_CSP_ORIGIN = "https://www.youtube-nocookie.com";

/** Origin serving the analytics script and receiving its events. */
export const ANALYTICS_CSP_ORIGIN = "https://umami.layered.work";

/** Address the analytics script is loaded from. */
export const ANALYTICS_SCRIPT_URL = `${ANALYTICS_CSP_ORIGIN}/script.js`;

/**
 * The site as the analytics instance knows it.
 *
 * @remarks
 * Every script that reports to that instance carries this, and they have to
 * carry the same one: the recorder asks for its configuration under this id
 * and posts recordings under it, so a second value would record a site that
 * has nothing switched on and drop everything on the floor.
 */
export const ANALYTICS_WEBSITE_ID = "ebec4dd2-b578-4f10-a416-6503c7fe2da0";

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
  "sha384-FeSgFWhRpNmUWqmtRLZpDSRTuxgovbVqlyM0OaJpq2IanhF2u3xjYziXsyXR9Kg/";

/** Address the session recorder is loaded from. */
export const RECORDER_SCRIPT_URL = `${ANALYTICS_CSP_ORIGIN}/recorder.js`;

/**
 * Integrity hash of the session recorder, on the same terms as the tracker above.
 *
 * @remarks
 * The recorder is forty times the size of the tracker and reads far more of the
 * page, so the case for pinning it is the stronger of the two. It goes stale the
 * same way, and `scripts/check-analytics-integrity.mjs` checks both.
 */
export const RECORDER_SCRIPT_INTEGRITY =
  "sha384-RFbJB7wXp6wvtb7Yj7euqgFcWmpCYnwbQM8RHA4TiyV8qukjCB/YV9blThgO/M5Z";

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
  const directives = policy.split(";").flatMap((directive) => {
    const trimmed = directive.trim();
    return trimmed ? [trimmed] : [];
  });

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
