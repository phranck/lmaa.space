/**
 * Runtime API base URL for client-side code (React islands, Vanilla JS scripts).
 * Uses PUBLIC_API_URL env var; falls back to /api (proxied via Vite/Astro dev server).
 */
export const API_BASE = import.meta.env.PUBLIC_API_URL ?? "/api";
