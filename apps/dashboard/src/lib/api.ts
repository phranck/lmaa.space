import { createApiRequestError, createNetworkRequestError } from "@lmaa/shared/api-error";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";
const FETCH_TIMEOUT_MS = 30_000;
const UPLOAD_FETCH_TIMEOUT_MS = 5 * 60_000;

export interface UploadProgress {
  loaded: number;
  total: number | null;
  percent: number | null;
}

export interface UploadRequestOptions {
  onProgress?: (progress: UploadProgress) => void;
  onUploadComplete?: () => void;
}

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
 * Executes a fetch with an AbortController-based timeout, translating
 * transport failures (timeout, abort, dropped connection) into typed
 * `ApiRequestError` instances with stable `code` and English message.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (timedOut) {
      throw createNetworkRequestError("timeout", cause);
    }
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw createNetworkRequestError("aborted", cause);
    }
    throw createNetworkRequestError("network", cause);
  } finally {
    clearTimeout(timeoutId);
  }
}

function createXhrResponse(xhr: XMLHttpRequest) {
  return {
    status: xhr.status,
    json: async () => JSON.parse(xhr.responseText || "null"),
  };
}

function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  options?: UploadRequestOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.timeout = UPLOAD_FETCH_TIMEOUT_MS;

    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : null;
      options?.onProgress?.({
        loaded: event.loaded,
        total,
        percent: total && total > 0 ? Math.round((event.loaded / total) * 100) : null,
      });
    };

    xhr.upload.onload = () => {
      options?.onUploadComplete?.();
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText || "{}") as { data?: T };
          resolve(body.data as T);
        } catch (cause) {
          reject(createNetworkRequestError("network", cause));
        }
        return;
      }

      void createApiRequestError(createXhrResponse(xhr)).then(reject);
    };

    xhr.onerror = () => {
      reject(createNetworkRequestError("network"));
    };

    xhr.onabort = () => {
      reject(createNetworkRequestError("aborted"));
    };

    xhr.ontimeout = () => {
      reject(createNetworkRequestError("timeout"));
    };

    xhr.send(formData);
  });
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

  upload: <T>(path: string, formData: FormData, options?: UploadRequestOptions): Promise<T> =>
    options
      ? uploadWithProgress<T>(`${API_BASE}${path}`, formData, options)
      : fetchWithTimeout(
          `${API_BASE}${path}`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          },
          UPLOAD_FETCH_TIMEOUT_MS,
        ).then((r) => handleResponse<T>(r)),
};
