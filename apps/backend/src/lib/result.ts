/**
 * Discriminated union for service return values.
 *
 * Usage:
 *   return success({ user })    // { ok: true, user: ... }
 *   return failure("not_found") // { ok: false, reason: "not_found" }
 */

/** Successful discriminated-union branch carrying optional payload `T`. */
export type Success<T extends Record<string, unknown> = Record<string, never>> = { ok: true } & T;
/** Failed discriminated-union branch carrying a typed reason string `R`. */
export type Failure<R extends string = string> = { ok: false; reason: R };
/** Discriminated union of `Success<T>` and `Failure<R>` for service return values. */
export type Result<
  T extends Record<string, unknown> = Record<string, never>,
  R extends string = string,
> = Success<T> | Failure<R>;

/**
 * Creates a successful `Result` with an optional data payload.
 *
 * @param data - Optional key-value payload merged into `{ ok: true }`.
 * @returns `Success<T>` object.
 */
export function success(): Success;
export function success<T extends Record<string, unknown>>(data: T): Success<T>;
export function success<T extends Record<string, unknown>>(data?: T): Success<T> {
  return { ok: true as const, ...data } as Success<T>;
}

/**
 * Creates a failed `Result` with a typed reason string.
 *
 * @param reason - String literal identifying the failure cause.
 * @returns `Failure<R>` object.
 */
export function failure<R extends string>(reason: R): Failure<R> {
  return { ok: false as const, reason };
}
