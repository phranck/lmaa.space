/**
 * Server-side API client for Astro frontmatter/SSR only.
 * Runtime browser calls use PUBLIC_API_URL (api.lmaa.space) directly.
 */
const DEV_DEFAULT_API_URL = "http://localhost:3000/api";
const PROD_FETCH_TIMEOUT_MS = 8_000;
const DEV_FETCH_TIMEOUT_MS = 5_000;

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

/**
 * Resolves backend-hosted upload URLs for frontend rendering.
 *
 * Hidden behavior: relative `/uploads/*` paths are rewritten to the configured
 * backend origin while absolute URLs stay unchanged.
 *
 * @param url - Raw image URL from API responses.
 * @returns Absolute image URL or `null` when input is empty.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

/**
 * Executes a typed GET request against the backend API.
 *
 * @typeParam T - Expected `data` payload type.
 * @param path - API path starting with `/`.
 * @returns Parsed `data` payload cast to `T`.
 * @throws Error when the request fails or the API answers non-2xx.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const timeoutMs = import.meta.env.DEV ? DEV_FETCH_TIMEOUT_MS : PROD_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    throw new Error(
      `API fetch failed for ${url} — is API_URL set correctly? (current: ${API_BASE})\n${err}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  const json = await res.json();
  return json.data as T;
}
