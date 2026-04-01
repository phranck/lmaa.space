/**
 * Minimal typed fetch wrapper for frontend islands.
 *
 * Extracts the `data` field from the API's standard `{ data: T }` envelope.
 * Uses AbortSignal for cancellation support.
 */

import { API_BASE } from "@/lib/client-api";

interface ApiEnvelope<T> {
  data: T;
}

/**
 * Fetch JSON from the backend API.
 *
 * @param path - API path (e.g. `/shops` or `/filtered/categories?city=Berlin`).
 * @param init - Optional fetch init (method, body, signal, etc.).
 * @returns The unwrapped `data` payload.
 */
export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  const body: ApiEnvelope<T> = await res.json();
  return body.data;
}
