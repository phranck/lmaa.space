import { describe, expect, it } from "vitest";

import { DEFAULT_IP_HASH_SALT, envSchema } from "../config/env.js";

const VALID_BASE = {
  DATABASE_URL: "postgres://localhost/test",
  PORT: "3000",
  DASHBOARD_URL: "http://localhost:5174",
  FRONTEND_URL: "http://localhost:4321",
};

describe("envSchema", () => {
  it("requires DATABASE_URL", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("requires DASHBOARD_URL and FRONTEND_URL", () => {
    const result = envSchema.safeParse({ DATABASE_URL: "postgres://localhost/test" });
    expect(result.success).toBe(false);
  });

  it("falls back to the port the deployment declares", () => {
    const { PORT: _unset, ...withoutPort } = VALID_BASE;
    const result = envSchema.safeParse(withoutPort);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3000);
    }
  });

  it("accepts valid minimal config", () => {
    const result = envSchema.safeParse(VALID_BASE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("development");
      expect(result.data.IP_HASH_SALT).toBe(DEFAULT_IP_HASH_SALT);
      expect(result.data.RUN_MIGRATIONS_ON_STARTUP).toBe(true);
    }
  });

  it("parses RUN_MIGRATIONS_ON_STARTUP", () => {
    const result = envSchema.safeParse({
      ...VALID_BASE,
      RUN_MIGRATIONS_ON_STARTUP: "false",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.RUN_MIGRATIONS_ON_STARTUP).toBe(false);
    }
  });

  it("defaults DATABASE_URL_MIGRATOR to DATABASE_URL", () => {
    const result = envSchema.safeParse(VALID_BASE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL_MIGRATOR).toBe("postgres://localhost/test");
    }
  });

  it("accepts an explicit DATABASE_URL_MIGRATOR", () => {
    const result = envSchema.safeParse({
      ...VALID_BASE,
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
      ...VALID_BASE,
      IP_HASH_SALT: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts IP_HASH_SALT of 16+ characters", () => {
    const result = envSchema.safeParse({
      ...VALID_BASE,
      NODE_ENV: "production",
      IP_HASH_SALT: "this-is-a-valid-salt-value",
    });
    expect(result.success).toBe(true);
  });

  it("requires IP_HASH_SALT in production", () => {
    const result = envSchema.safeParse({
      ...VALID_BASE,
      NODE_ENV: "production",
    });
    expect(result.success).toBe(false);
  });

  it("coerces PORT to number", () => {
    const result = envSchema.safeParse({
      ...VALID_BASE,
      PORT: "8080",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(8080);
    }
  });
});
