/**
 * The `Cache-Control` values the public API answers with.
 *
 * They exist as named values rather than as strings written out at each route,
 * so a route says what kind of thing it serves and the lifetime follows from
 * that. Two routes serving the same kind of thing then cannot drift apart, and
 * changing what "editable" means is one edit rather than nine.
 *
 * `stale-while-revalidate` is longer than `max-age` everywhere it appears, so a
 * cache may serve the previous answer whilst it fetches the next one. That
 * keeps delivery fast without lengthening the window in which an edit stays
 * invisible.
 */

/**
 * A page whose text a person edits and expects to see at once.
 *
 * `no-cache` does not forbid keeping a copy. It forbids using one without
 * asking first, which is exactly right here: the answer is cheap to produce and
 * an editor who saves and reloads must not be shown the previous version. The
 * renderer's own cache treats it as not cacheable, so a save is visible on the
 * next request.
 */
export const CACHE_REVALIDATE = "public, no-cache";

/**
 * Configuration a person edits in the dashboard, shown on every page.
 *
 * A minute is short enough that an editor does not doubt the save and long
 * enough that one edit does not cost a query on every page view afterwards.
 */
export const CACHE_EDITABLE = "public, max-age=60, stale-while-revalidate=300";

/**
 * Data that changes on its own as the site is used, such as counts and listings.
 */
export const CACHE_VOLATILE = "public, max-age=60";

/**
 * Data that changes rarely and is not edited in a loop, such as the navigation
 * or the set of available filters.
 */
export const CACHE_STABLE = "public, max-age=300, stale-while-revalidate=3600";

/**
 * A response shaped by who is asking, which no shared cache may keep.
 */
export const CACHE_PER_VISITOR = "private, max-age=30";

/**
 * A response that must never be kept, such as a preview behind a one-off token.
 */
export const CACHE_NONE = "no-store";
