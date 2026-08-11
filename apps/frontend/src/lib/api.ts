/**
 * Server-side API client for Astro frontmatter/SSR only.
 * Runtime browser calls use PUBLIC_API_URL (/api/v1 via same-origin proxy).
 */
const PROD_FETCH_TIMEOUT_MS = 8_000;
const DEV_FETCH_TIMEOUT_MS = 5_000;

function normalizeApiBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

function resolveApiBase(): string {
  const value = process.env.BACKEND_URL?.trim() || process.env.API_URL?.trim();

  if (!value) {
    throw new Error("Missing BACKEND_URL/API_URL runtime env for frontend server.");
  }

  return normalizeApiBase(value);
}

/**
 * Header that marks a fetch as coming from our own server-side rendering.
 *
 * @remarks
 * These requests hit the same public endpoints a visitor's browser does, but
 * they arrive at the backend without a client address and would otherwise all
 * share one rate-limit bucket. The token is optional: without it the requests
 * are simply counted as before.
 */
const INTERNAL_REQUEST_HEADER = "x-internal-request";
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN?.trim() || null;

const API_BASE = resolveApiBase();
const BACKEND_ORIGIN = new URL(API_BASE).origin;

/**
 * Executes a typed GET request against the backend API.
 *
 * @typeParam T - Expected `data` payload type.
 * @param path - API path starting with `/`.
 * @returns Parsed `data` payload cast to `T`.
 * @throws Error when the request fails or the API answers non-2xx.
 */
export async function apiGet<T>(path: string): Promise<T> {
  return getJson<T>(`${API_BASE}${path}`, `API ${path}`, API_BASE);
}

/**
 * Executes a typed GET request against a website-internal backend route.
 *
 * Internal routes are intentionally outside `/api/v1` and the external OpenAPI
 * surface. Use this only from server-side Astro code.
 */
export async function apiGetInternal<T>(path: string): Promise<T> {
  return getJson<T>(`${BACKEND_ORIGIN}${path}`, `Internal API ${path}`, BACKEND_ORIGIN);
}

async function getJson<T>(url: string, label: string, configuredBase: string): Promise<T> {
  const timeoutMs = import.meta.env.DEV ? DEV_FETCH_TIMEOUT_MS : PROD_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: INTERNAL_API_TOKEN ? { [INTERNAL_REQUEST_HEADER]: INTERNAL_API_TOKEN } : undefined,
    });
  } catch (err) {
    throw new Error(
      `API fetch failed for ${url} — is API_URL set correctly? (current: ${configuredBase})\n${err}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) throw new Error(`${label}: ${res.status}`);
  const json = await res.json();
  return json.data as T;
}
