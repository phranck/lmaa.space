/**
 * Runtime API base URL for client-side code (React islands, Vanilla JS scripts).
 * Uses PUBLIC_API_URL env var (production should point to api.lmaa.space);
 * falls back to /api for local dev via Vite/Astro proxy (same-origin).
 */
const rawApiBase = import.meta.env.PUBLIC_API_URL;
const normalizedApiBase =
  typeof rawApiBase === "string" ? rawApiBase.trim().replace(/\/+$/, "") : "";

/**
 * Client-side API base URL for browser fetch calls.
 *
 * Hidden behavior: falls back to same-origin `/api` when no public env value is
 * configured, which keeps local dev and reverse-proxy setups working.
 */
export const API_BASE = normalizedApiBase || "/api";
