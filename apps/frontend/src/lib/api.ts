const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

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
