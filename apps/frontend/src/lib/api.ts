const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

// Derives the backend origin (without /api) for resolving /uploads/ paths.
// e.g. "https://api.lmaa.space/api" → "https://api.lmaa.space"
//      "/api" (dev)                 → "" (relative, handled by Vite proxy)
const BACKEND_ORIGIN = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : "";

/** Resolves a stored imageUrl (which may be a relative /uploads/ path) to a full URL. */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${API_BASE}${path}`).then((r) => handleResponse<T>(r)),

  post: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),

  patch: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),

  put: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),

  delete: <T>(path: string): Promise<T> =>
    fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => handleResponse<T>(r)),
};
