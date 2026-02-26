/**
 * Runtime API base URL for client-side code (React islands, Vanilla JS scripts).
 * Uses PUBLIC_API_URL env var (production should point to api.lmaa.space);
 * falls back to /api for local dev via Vite/Astro proxy.
 */
const rawApiBase = import.meta.env.PUBLIC_API_URL;
const normalizedApiBase =
  typeof rawApiBase === "string" ? rawApiBase.trim().replace(/\/+$/, "") : "";

export const API_BASE = normalizedApiBase || "/api";
