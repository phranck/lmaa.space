/**
 * Error shape used by frontend/dashboard API wrappers.
 */
export interface ApiRequestError extends Error {
  status?: number;
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
  const message = responseMessage ?? fallbackMessage ?? `HTTP ${response.status}`;
  const error = new Error(message) as ApiRequestError;
  error.status = response.status;
  error.responseMessage = responseMessage;
  return error;
}
