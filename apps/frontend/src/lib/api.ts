/**
 * Server-side API client for Astro frontmatter/SSR only.
 * Runtime browser calls use PUBLIC_API_URL (/api/v1 via same-origin proxy).
 */
import { cacheableSeconds } from "./cache-control.js";

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

const API_BASE = resolveApiBase();
const BACKEND_ORIGIN = new URL(API_BASE).origin;

/**
 * Responses held for as long as the backend says they stay valid.
 *
 * @remarks
 * Rendering one page fetches the navigation, the footer configuration, the
 * social accounts and the preview image, and every one of those answers is the
 * same for every visitor. Without this each page view asks the backend for all
 * of them again.
 *
 * The lifetime is not configured here. Each endpoint already states it in its
 * own `Cache-Control`, so there is no second list to keep in step: `/nav/header`
 * says five minutes, `/footer-config` says one, and `/hero` says `no-store` and
 * is therefore never held.
 */
const responseCache = new Map<string, { data: unknown; expiresAt: number }>();

/** Upper bound on held entries, so a long-running server cannot grow unbounded. */
const MAX_CACHE_ENTRIES = 200;

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
  const cached = responseCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;

  const timeoutMs = import.meta.env.DEV ? DEV_FETCH_TIMEOUT_MS : PROD_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    throw new Error(
      `API fetch failed for ${url} — is API_URL set correctly? (current: ${configuredBase})\n${err}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) throw new Error(`${label}: ${res.status}`);
  const json = await res.json();
  const data = json.data as T;

  const seconds = cacheableSeconds(res.headers.get("cache-control"));
  if (seconds > 0) {
    // Map keeps insertion order, so the oldest entry is the first key.
    if (responseCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = responseCache.keys().next().value;
      if (oldest !== undefined) responseCache.delete(oldest);
    }
    responseCache.set(url, { data, expiresAt: Date.now() + seconds * 1000 });
  }

  return data;
}
