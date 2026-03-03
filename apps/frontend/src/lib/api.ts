/**
 * Server-side API client for Astro frontmatter/SSR only.
 * Runtime browser calls use PUBLIC_API_URL (/api/v1 via same-origin proxy).
 */
const DEV_DEFAULT_API_URL = "http://localhost:3000/api/v1";
const PROD_FETCH_TIMEOUT_MS = 8_000;
const DEV_FETCH_TIMEOUT_MS = 5_000;

function normalizeApiBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

function resolveApiBase(): string {
  const configured = process.env.API_URL?.trim();
  const fallback = import.meta.env.DEV ? DEV_DEFAULT_API_URL : "";
  const value = configured || fallback;

  if (!value) {
    throw new Error("Missing API_URL runtime env for frontend server.");
  }

  const base = normalizeApiBase(value);

  return base;
}

const API_BASE = resolveApiBase();

/**
 * Resolves backend-hosted upload URLs for frontend rendering.
 *
 * Relative `/uploads/*` paths stay relative (served via same-origin proxy).
 * Absolute URLs stay unchanged.
 *
 * @param url - Raw image URL from API responses.
 * @returns Image URL or `null` when input is empty.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
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
