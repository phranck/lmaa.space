type AnalyticsPrimitive = string | number | boolean | null;

export type WebsiteAnalyticsEventName =
  | "site-search"
  | "category-click"
  | "shop-visit-click"
  | "site-link-click";

export type WebsiteAnalyticsPayload = Record<string, AnalyticsPrimitive>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: WebsiteAnalyticsPayload) => void;
    };
  }
}

export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 120;

export function normalizeSearchQuery(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < SEARCH_QUERY_MIN_LENGTH) return null;

  return normalized.slice(0, SEARCH_QUERY_MAX_LENGTH);
}

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
