/**
 * Reading what PostgreSQL says when a write is refused.
 *
 * The driver throws a plain object rather than a typed error, so the code has to
 * be read off it by hand. Doing that in one place keeps the class codes out of
 * the services and stops two call sites disagreeing about which field carries
 * the constraint name.
 */

/** PostgreSQL class 23505, raised when a write breaks a unique constraint. */
const UNIQUE_VIOLATION = "23505";

/**
 * Says whether a write was refused because a unique constraint already held.
 *
 * @param error - Whatever the driver threw.
 * @param constraint - The constraint that was expected to be the one broken. Left
 *   out, any unique constraint counts, which is right where a table has only one.
 * @returns `true` when the error is a unique violation on that constraint.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (typeof error !== "object" || error === null) return false;

  const { code, constraint_name: constraintName } = error as {
    code?: string;
    constraint_name?: string;
  };
  if (code !== UNIQUE_VIOLATION) return false;
  return constraint === undefined || constraintName === constraint;
}
