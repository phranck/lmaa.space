import { z } from "zod";

/** Fallback IP hash salt used in development. Never used in production (validated by `envSchema`). */
export const DEFAULT_IP_HASH_SALT = "local-dev-salt-not-for-production";

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_URL_MIGRATOR: z.string().optional(),
    DB_MIGRATION_ROLE: z.string().optional(),
    IMAGE_PATH: z.string().default("./uploads"),
    S3_ENDPOINT: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    SESSION_CLEANUP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(1 * 60 * 60 * 1000),
    RATE_LIMIT_CLEANUP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5 * 60 * 1000),
    CACHE_CLEANUP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10 * 60 * 1000),
    IP_HASH_SALT: z.string().optional(),
    // Source of the trusted client IP for rate limiting. Must match the actual
    // edge topology: the backend runs directly behind the Zerops L7 proxy (no
    // Cloudflare), which appends the real peer IP to X-Forwarded-For. Override
    // to "cf-connecting-ip" only if a Cloudflare proxy that sets and sanitizes
    // that header is placed in front. Verify TRUST_PROXY_HOPS against the live
    // X-Forwarded-For chain before relying on per-IP limits.
    TRUST_PROXY_IP_HEADER: z
      .enum(["cf-connecting-ip", "x-real-ip", "x-forwarded-for"])
      .default("x-forwarded-for"),
    TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),
    SMTP2GO_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("hallo@lmaa.space"),
    DASHBOARD_URL: z.string().url().optional(),
    FRONTEND_URL: z.string().url().optional(),
    OWNER_EMAIL: z.string().email().optional(),
    UNSPLASH_ACCESS_KEY: z.string().optional(),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default("mailto:hallo@lmaa.space"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    RUN_MIGRATIONS_ON_STARTUP: z.enum(["true", "false"]).default("true"),
    // ── Automated shop review ────────────────────────────────────────────────
    // The provider key is the only piece of review configuration that lives in
    // the environment, because it is a secret. Everything else is a system
    // setting, so it can be changed in the dashboard and takes effect on the
    // next worker tick rather than on the next deployment.
    //
    // The key is optional so the site keeps running without it. The review
    // worker checks for it and stays idle when it is missing, which keeps a
    // missing provider credential from taking the website down.
    ANTHROPIC_API_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.IP_HASH_SALT && data.IP_HASH_SALT.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        inclusive: true,
        minimum: 16,
        type: "string",
        path: ["IP_HASH_SALT"],
        message: "IP_HASH_SALT must be at least 16 characters",
      });
    }

    if (data.NODE_ENV === "production" && !data.IP_HASH_SALT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["IP_HASH_SALT"],
        message: "IP_HASH_SALT is required in production",
      });
    }

    if (data.NODE_ENV !== "production" && !data.DASHBOARD_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DASHBOARD_URL"],
        message:
          "DASHBOARD_URL is required in non-production. Define it in .env.local — manually or via pewee.",
      });
    }

    if (data.NODE_ENV !== "production" && !data.FRONTEND_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FRONTEND_URL"],
        message:
          "FRONTEND_URL is required in non-production. Define it in .env.local — manually or via pewee.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    IP_HASH_SALT: data.IP_HASH_SALT ?? DEFAULT_IP_HASH_SALT,
    DATABASE_URL_MIGRATOR: data.DATABASE_URL_MIGRATOR ?? data.DATABASE_URL,
    RUN_MIGRATIONS_ON_STARTUP: data.RUN_MIGRATIONS_ON_STARTUP === "true",
    // Production-only fallbacks; non-prod paths are blocked by superRefine above.
    DASHBOARD_URL: data.DASHBOARD_URL ?? "https://dashboard.lmaa.space",
    FRONTEND_URL: data.FRONTEND_URL ?? "https://lmaa.space",
  }));

/**
 * Validated backend environment configuration.
 *
 * @throws {z.ZodError} When required environment variables are missing/invalid.
 */
export const env = envSchema.parse(process.env);
