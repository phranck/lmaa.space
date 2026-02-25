/**
 * Build-time API client for use in Astro frontmatter only.
 * Runtime calls (from shop-actions.ts) use fetch('/api/...') directly.
 */
const API_BASE = import.meta.env.API_URL ?? "http://localhost:3000/api";

const BACKEND_ORIGIN = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : "";

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      `API fetch failed for ${url} — is API_URL set correctly? (current: ${API_BASE})\n${err}`,
    );
  }
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  const json = await res.json();
  return json.data as T;
}
