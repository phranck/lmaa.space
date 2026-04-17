/**
 * Stable, machine-readable error codes raised by the dashboard API client when
 * the request never produced an HTTP response (network failure, abort, timeout).
 */
export const API_ERROR_CODE_REQUEST_TIMEOUT = "REQUEST_TIMEOUT";
export const API_ERROR_CODE_REQUEST_ABORTED = "REQUEST_ABORTED";
export const API_ERROR_CODE_NETWORK_LOST = "NETWORK_LOST";

/**
 * Error shape used by frontend/dashboard API wrappers.
 */
export interface ApiRequestError extends Error {
  status?: number;
  code?: string;
  responseMessage?: string | null;
}

interface HttpResponseLike {
  status: number;
  json: () => Promise<unknown>;
}

function getObjectValue(payload: unknown, key: string): unknown {
  if (!payload || typeof payload !== "object") return undefined;
  return key in payload ? (payload as Record<string, unknown>)[key] : undefined;
}

/**
 * Extracts the backend's machine-readable error code from an API payload.
 *
 * @param payload Parsed JSON payload from failed API responses.
 * @returns Extracted code or `null` when payload has no `error.code` field.
 */
export function extractApiErrorCode(payload: unknown): string | null {
  const error = getObjectValue(payload, "error");
  const code = getObjectValue(error, "code");
  return typeof code === "string" ? code : null;
}

/**
 * Extracts the best available human-readable error message from an API payload.
 *
 * @param payload Parsed JSON payload from failed API responses.
 * @returns Extracted message or `null` when payload has no known message fields.
 */
export function extractApiErrorMessage(payload: unknown): string | null {
  const error = getObjectValue(payload, "error");
  const directMessage = getObjectValue(error, "message");
  if (typeof directMessage === "string") {
    return directMessage;
  }

  const issues = getObjectValue(error, "issues");
  if (Array.isArray(issues)) {
    const firstIssue = issues[0];
    const issueMessage = getObjectValue(firstIssue, "message");
    if (typeof issueMessage === "string") {
      return issueMessage;
    }
  }

  const fallbackMessage = getObjectValue(payload, "message");
  return typeof fallbackMessage === "string" ? fallbackMessage : null;
}

/**
 * Creates a normalized request error from a failed HTTP response.
 *
 * @param response HTTP response-like object from `fetch`.
 * @param fallbackMessage Optional message used when API payload has no error details.
 * @returns Error object enriched with status code and parsed response message.
 */
export async function createApiRequestError(
  response: HttpResponseLike,
  fallbackMessage?: string,
): Promise<ApiRequestError> {
  const payload = await response.json().catch(() => null);
  const responseMessage = extractApiErrorMessage(payload);
  const responseCode = extractApiErrorCode(payload);
  const message = responseMessage ?? fallbackMessage ?? `HTTP ${response.status}`;
  const error = new Error(message) as ApiRequestError;
  error.status = response.status;
  error.responseMessage = responseMessage;
  if (responseCode) {
    error.code = responseCode;
  }
  return error;
}

/**
 * Reason classification for transport-layer failures (no HTTP response received).
 */
export type NetworkErrorReason = "timeout" | "aborted" | "network";

/**
 * Builds a typed `ApiRequestError` for transport failures where the request
 * never produced an HTTP response. Use this in API clients to translate native
 * `TypeError` ("Load failed", "Failed to fetch") and `AbortError` instances
 * into a stable, diagnosable error shape.
 *
 * @param reason Classification of the failure.
 * @param cause Original thrown value for chaining/logging.
 * @returns Error tagged with code and English diagnostic message.
 */
export function createNetworkRequestError(
  reason: NetworkErrorReason,
  cause?: unknown,
): ApiRequestError {
  let code: string;
  let message: string;
  switch (reason) {
    case "timeout":
      code = API_ERROR_CODE_REQUEST_TIMEOUT;
      message = "Request timed out — the server did not respond in time.";
      break;
    case "aborted":
      code = API_ERROR_CODE_REQUEST_ABORTED;
      message = "Request was aborted before completion.";
      break;
    case "network":
      code = API_ERROR_CODE_NETWORK_LOST;
      message = "Network connection to the server was lost. Please check your connection and try again.";
      break;
  }
  const error = new Error(message, cause !== undefined ? { cause } : undefined) as ApiRequestError;
  error.code = code;
  error.responseMessage = null;
  return error;
}
