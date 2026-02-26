import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { env } from "../config/env.js";

type ApiError = {
  message: string;
  code?: string;
};

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal Server Error";

export class HttpError extends Error {
  constructor(
    public readonly status: StatusCode,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function ok<T>(c: Context, data: T, status: StatusCode = 200) {
  c.status(status);
  return c.json({ data });
}

export function fail(c: Context, status: StatusCode, message: string, code?: string) {
  const error: ApiError = code ? { message, code } : { message };
  c.status(status);
  return c.json({ error });
}

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

export function respondError(c: Context, error: unknown) {
  const { status, error: payload } = getErrorResponse(error);
  c.status(status);
  return c.json({ error: payload });
}
