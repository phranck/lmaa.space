import { describe, expect, it } from "vitest";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  IP_HASH_SALT: z
    .string()
    .min(16, "IP_HASH_SALT must be at least 16 characters")
    .default("local-dev-salt-not-for-production"),
});

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
      DATABASE_URL: "postgres://localhost/test",
      IP_HASH_SALT: "this-is-a-valid-salt-value",
    });
    expect(result.success).toBe(true);
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
