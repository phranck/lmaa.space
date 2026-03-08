import { describe, expect, it } from "vitest";

import { DEFAULT_IP_HASH_SALT, envSchema } from "../config/env.js";

describe("envSchema", () => {
  it("requires DATABASE_URL", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts valid minimal config", () => {
    const result = envSchema.safeParse({ DATABASE_URL: "postgres://localhost/test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3000);
      expect(result.data.NODE_ENV).toBe("development");
      expect(result.data.IP_HASH_SALT).toBe(DEFAULT_IP_HASH_SALT);
      expect(result.data.RUN_MIGRATIONS_ON_STARTUP).toBe(true);
    }
  });

  it("parses RUN_MIGRATIONS_ON_STARTUP", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgres://localhost/test",
      RUN_MIGRATIONS_ON_STARTUP: "false",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.RUN_MIGRATIONS_ON_STARTUP).toBe(false);
    }
  });

  it("defaults DATABASE_URL_MIGRATOR to DATABASE_URL", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgres://localhost/test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL_MIGRATOR).toBe("postgres://localhost/test");
    }
  });

  it("accepts an explicit DATABASE_URL_MIGRATOR", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgres://localhost/runtime",
      DATABASE_URL_MIGRATOR: "postgres://localhost/migrator",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL_MIGRATOR).toBe("postgres://localhost/migrator");
    }
  });

  it("rejects IP_HASH_SALT shorter than 16 characters", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgres://localhost/test",
      IP_HASH_SALT: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts IP_HASH_SALT of 16+ characters", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://localhost/test",
      IP_HASH_SALT: "this-is-a-valid-salt-value",
    });
    expect(result.success).toBe(true);
  });

  it("requires IP_HASH_SALT in production", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://localhost/test",
    });
    expect(result.success).toBe(false);
  });

  it("coerces PORT to number", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgres://localhost/test",
      PORT: "8080",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(8080);
    }
  });
});
