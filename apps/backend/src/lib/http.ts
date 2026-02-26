import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";

type ApiError = {
  message: string;
  code?: string;
};

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
    return {
      status: 500,
      error: { message: error.message || "Internal Server Error" },
    };
  }

  return {
    status: 500,
    error: { message: "Internal Server Error" },
  };
}

export function respondError(c: Context, error: unknown) {
  const { status, error: payload } = getErrorResponse(error);
  c.status(status);
  return c.json({ error: payload });
}
