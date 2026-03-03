/**
 * Runtime API base URL for client-side code (React islands, Vanilla JS scripts).
 * Uses PUBLIC_API_URL env var (production: /api/v1 via same-origin proxy).
 * Falls back to `/api/v1` only in local dev via Vite proxy.
 */
const rawApiBase = import.meta.env.PUBLIC_API_URL;
const normalizedApiBase =
  typeof rawApiBase === "string" ? rawApiBase.trim().replace(/\/+$/, "") : "";

/**
 * Client-side API base URL for browser fetch calls.
 *
 * Hidden behavior: in production, missing `PUBLIC_API_URL` throws early to
 * prevent accidental fallback.
 */
export const API_BASE =
  normalizedApiBase ||
  (import.meta.env.DEV
    ? "/api/v1"
    : typeof window === "undefined"
      ? "" // SSR context (Node.js): API_BASE is never used for client-side fetches
      : (() => {
          throw new Error("Missing PUBLIC_API_URL in production build.");
        })());
