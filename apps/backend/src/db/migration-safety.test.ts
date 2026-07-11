import { describe, expect, it } from "vitest";

import { assertApplicationTableOwnership, assertSafeMigrationIdentity } from "./migration-safety.js";

describe("assertSafeMigrationIdentity", () => {
  it("rejects a remote superuser before Drizzle executes", () => {
    expect(() =>
      assertSafeMigrationIdentity({
        currentRole: "postgres",
        expectedRole: "db",
        host: "postgres.zerops",
        isSuperuser: true,
      }),
    ).toThrow(/superuser/i);
  });

  it("requires the configured remote migration role", () => {
    expect(() =>
      assertSafeMigrationIdentity({
        currentRole: "unexpected",
        expectedRole: "db",
        host: "postgres.zerops",
        isSuperuser: false,
      }),
    ).toThrow(/expected role/i);
  });

  it("allows the expected non-superuser role", () => {
    expect(() =>
      assertSafeMigrationIdentity({
        currentRole: "db",
        expectedRole: "db",
        host: "postgres.zerops",
        isSuperuser: false,
      }),
    ).not.toThrow();
  });
});

describe("assertApplicationTableOwnership", () => {
  it("rejects public application tables owned by another role", () => {
    expect(() => assertApplicationTableOwnership([{ owner: "postgres", tableName: "new_table" }], "db")).toThrow(
      /new_table.*postgres/i,
    );
  });

  it("allows an empty mismatch report", () => {
    expect(() => assertApplicationTableOwnership([], "db")).not.toThrow();
  });
});
