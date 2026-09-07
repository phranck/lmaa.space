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
 * How many layers of `cause` are followed before giving up.
 *
 * A bound rather than a belief about the depth: `cause` is an ordinary property
 * and a chain that loops back on itself would otherwise never end.
 */
const MAX_CAUSE_DEPTH = 8;

/** The two fields this module reads off whatever the database threw. */
interface DatabaseErrorFields {
  code?: string;
  constraint_name?: string;
}

/**
 * Every error in a chain, starting with the one that was thrown.
 *
 * @param error - Whatever was caught.
 * @yields Each error, following `cause` until it runs out.
 *
 * @remarks
 * A query made through Drizzle does not throw the driver's error. It throws a
 * `DrizzleQueryError` carrying the query, the parameters and the driver's error
 * as `cause`, so the class code sits one layer down. Outside a query the driver's
 * error arrives bare, and both have to be read the same way.
 */
function* errorChain(error: unknown): Generator<DatabaseErrorFields> {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== "object" || current === null) return;
    yield current as DatabaseErrorFields;
    current = (current as { cause?: unknown }).cause;
  }
}

/**
 * Says whether a write was refused because a unique constraint already held.
 *
 * @param error - Whatever was caught, wrapped or bare.
 * @param constraint - The constraint that was expected to be the one broken. Left
 *   out, any unique constraint counts, which is right where a table has only one.
 * @returns `true` when the error is a unique violation on that constraint.
 *
 * @remarks
 * The code and the constraint name are read off the same layer of the chain. A
 * wrapper carries neither, so taking them from wherever each happened to appear
 * would let a violation on one constraint answer for another.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  for (const { code, constraint_name: constraintName } of errorChain(error)) {
    if (code !== UNIQUE_VIOLATION) continue;
    return constraint === undefined || constraintName === constraint;
  }
  return false;
}
