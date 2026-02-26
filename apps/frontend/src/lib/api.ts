/**
 * Server-side API client for Astro frontmatter/SSR only.
 * Runtime browser calls use /api/* via same-origin fetch.
 */
const DEV_DEFAULT_API_URL = "http://localhost:3000/api";

function normalizeApiBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function resolveApiBase(): string {
  const configured = process.env.API_URL?.trim();
  const fallback = import.meta.env.DEV ? DEV_DEFAULT_API_URL : "";
  const value = configured || fallback;

  if (!value) {
    throw new Error("Missing API_URL runtime env for frontend server.");
  }

  const base = normalizeApiBase(value);

  if (process.env.NODE_ENV === "production") {
    const hostname = new URL(base).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      throw new Error(`Invalid API_URL in production: ${base}`);
    }
  }

  return base;
}

const API_BASE = resolveApiBase();
const BACKEND_ORIGIN = API_BASE.slice(0, -4);

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
