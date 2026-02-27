import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { env } from "../config/env.js";

type ApiError = {
  message: string;
  code?: string;
};

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal Server Error";

/**
 * Domain error carrying explicit HTTP status and optional machine-readable code.
 */
export class HttpError extends Error {
  /**
   * @param status - HTTP status code for response mapping.
   * @param message - Human-readable error message.
   * @param code - Optional machine-readable error code.
   */
  constructor(
    public readonly status: StatusCode,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Sends success envelope `{ data }`.
 *
 * @param c - Hono context.
 * @param data - Response payload.
 * @param status - HTTP status (default `200`).
 * @returns JSON response with canonical success envelope.
 */
export function ok<T>(c: Context, data: T, status: StatusCode = 200) {
  c.status(status);
  return c.json({ data });
}

/**
 * Sends error envelope `{ error }`.
 *
 * @param c - Hono context.
 * @param status - HTTP status code.
 * @param message - Human-readable error message.
 * @param code - Optional machine-readable error code.
 * @returns JSON response with canonical error envelope.
 */
export function fail(c: Context, status: StatusCode, message: string, code?: string) {
  const error: ApiError = code ? { message, code } : { message };
  c.status(status);
  return c.json({ error });
}

/**
 * Normalizes unknown errors into stable API error response payload.
 *
 * @param error - Any thrown value.
 * @returns Object containing normalized HTTP status and API error payload.
 *
 * @remarks
 * In production, unknown `Error` instances are masked as
 * `"Internal Server Error"` to avoid leaking internals.
 */
export function getErrorResponse(error: unknown): { status: StatusCode; error: ApiError } {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      error: error.code ? { message: error.message, code: error.code } : { message: error.message },
    };
  }

  if (error instanceof Error) {
    const message =
      env.NODE_ENV === "production"
        ? INTERNAL_SERVER_ERROR_MESSAGE
        : error.message || INTERNAL_SERVER_ERROR_MESSAGE;

    return {
      status: 500,
      error: { message },
    };
  }

  return {
    status: 500,
    error: { message: INTERNAL_SERVER_ERROR_MESSAGE },
  };
}

/**
 * Writes normalized error response to the current context.
 *
 * @param c - Hono context.
 * @param error - Any thrown value.
 * @returns JSON response produced from normalized error payload.
 */
export function respondError(c: Context, error: unknown) {
  const { status, error: payload } = getErrorResponse(error);
  c.status(status);
  return c.json({ error: payload });
}
