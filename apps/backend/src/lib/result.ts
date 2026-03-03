/**
 * Discriminated union for service return values.
 *
 * Usage:
 *   return success({ user })    // { ok: true, user: ... }
 *   return failure("not_found") // { ok: false, reason: "not_found" }
 */

export type Success<T extends Record<string, unknown> = Record<string, never>> = { ok: true } & T;
export type Failure<R extends string = string> = { ok: false; reason: R };
export type Result<
  T extends Record<string, unknown> = Record<string, never>,
  R extends string = string,
> = Success<T> | Failure<R>;

export function success(): Success;
export function success<T extends Record<string, unknown>>(data: T): Success<T>;
export function success<T extends Record<string, unknown>>(data?: T): Success<T> {
  return { ok: true as const, ...data } as Success<T>;
}

export function failure<R extends string>(reason: R): Failure<R> {
  return { ok: false as const, reason };
}
