import { createApiRequestError } from "@lmaa/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Normalizes API responses and throws typed request errors on failure.
 *
 * @typeParam T - Expected response payload type.
 * @param res - Raw fetch response.
 * @returns Parsed `data` payload.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw await createApiRequestError(res);
  }
  const body = await res.json();
  return body.data as T;
}

/**
 * Executes a fetch with an AbortController-based timeout.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Lightweight dashboard API client with credentialed requests.
 *
 * Hidden behavior: all calls include cookies (`credentials: "include"`), which
 * is required for session-based admin auth.
 */
export const api = {
  get: <T>(path: string): Promise<T> =>
    fetchWithTimeout(`${API_BASE}${path}`, { credentials: "include" }).then((r) =>
      handleResponse<T>(r),
    ),

  post: <T>(path: string, body?: unknown): Promise<T> =>
    fetchWithTimeout(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),

  patch: <T>(path: string, body: unknown): Promise<T> =>
    fetchWithTimeout(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),

  put: <T>(path: string, body: unknown): Promise<T> =>
    fetchWithTimeout(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),

  delete: <T>(path: string, body?: unknown): Promise<T> =>
    fetchWithTimeout(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),

  upload: <T>(path: string, formData: FormData): Promise<T> =>
    fetchWithTimeout(`${API_BASE}${path}`, {
      method: "POST",
      body: formData,
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),
};
