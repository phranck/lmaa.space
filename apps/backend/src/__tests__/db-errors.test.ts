import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";

import { isUniqueViolation } from "../lib/db-errors.js";

/** The constraint the ledger keys a payment read from the bank on. */
const CONSTRAINT = "idx_donations_external_ref";

/**
 * The driver's own error, as `postgres` throws it.
 *
 * The fields are the ones read here. The class is not imported, because the
 * driver's error is an ordinary object as far as this check is concerned and
 * pinning its class would test the driver rather than this function.
 */
function driverError(constraintName = CONSTRAINT) {
  return Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "23505",
    constraint_name: constraintName,
  });
}

/**
 * The same error as it arrives from a Drizzle query.
 *
 * The real wrapper rather than an object shaped like it, so this fails if
 * Drizzle changes where it puts the driver's error again.
 */
function wrapped(cause: Error) {
  return new DrizzleQueryError("insert into donations …", [], cause);
}

describe("recognising a unique violation", () => {
  it("reads one the driver threw directly", () => {
    expect(isUniqueViolation(driverError())).toBe(true);
  });

  it("reads one a Drizzle query wrapped", () => {
    expect(isUniqueViolation(wrapped(driverError()))).toBe(true);
  });

  it("reads one wrapped twice, since nothing promises a single layer", () => {
    expect(isUniqueViolation(wrapped(wrapped(driverError())))).toBe(true);
  });

  it("matches the named constraint through the wrapper", () => {
    expect(isUniqueViolation(wrapped(driverError()), CONSTRAINT)).toBe(true);
  });

  it("refuses a different constraint through the wrapper", () => {
    expect(isUniqueViolation(wrapped(driverError("some_other_index")), CONSTRAINT)).toBe(false);
  });

  it("refuses an error that is not a unique violation", () => {
    const notUnique = Object.assign(new Error("null value in column"), { code: "23502" });
    expect(isUniqueViolation(wrapped(notUnique))).toBe(false);
  });

  it("refuses a wrapper carrying nothing", () => {
    expect(isUniqueViolation(new DrizzleQueryError("select 1", []))).toBe(false);
  });

  it("refuses what is not an error at all", () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
