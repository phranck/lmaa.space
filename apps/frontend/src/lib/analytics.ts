type AnalyticsPrimitive = string | number | boolean | null;

/** Named events tracked via the Umami analytics integration. */
type WebsiteAnalyticsEventName =
  | "site-search"
  | "category-click"
  | "shop-visit-click"
  | "site-link-click";

/** Arbitrary key-value event data attached to a tracked analytics event. */
export type WebsiteAnalyticsPayload = Record<string, AnalyticsPrimitive>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: WebsiteAnalyticsPayload) => void;
    };
  }
}

/** Minimum number of characters required to trigger a search. */
export const SEARCH_QUERY_MIN_LENGTH = 2;
/** Maximum number of characters accepted in a search query. */
export const SEARCH_QUERY_MAX_LENGTH = 120;

/**
 * Trims and normalizes a raw search input value.
 *
 * Collapses internal whitespace, enforces min/max length bounds.
 *
 * @param value - Raw form input value.
 * @returns Normalized query string, or `null` if too short or not a string.
 */
export function normalizeSearchQuery(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < SEARCH_QUERY_MIN_LENGTH) return null;

  return normalized.slice(0, SEARCH_QUERY_MAX_LENGTH);
}

/**
 * Fires a named Umami analytics event with optional payload data.
 *
 * Silently no-ops when `window.umami` is unavailable or tracking fails,
 * so it is safe to call in any context without try/catch at the call site.
 *
 * @param eventName - One of the allowed `WebsiteAnalyticsEventName` values.
 * @param eventData - Arbitrary key-value payload attached to the event.
 */
export function trackWebsiteEvent(
  eventName: WebsiteAnalyticsEventName,
  eventData: WebsiteAnalyticsPayload,
) {
  if (typeof window === "undefined" || typeof window.umami?.track !== "function") return;

  try {
    window.umami.track(eventName, eventData);
  } catch {
    // Tracking must never break navigation or UI interactions.
  }
}
