import { z } from "zod";

/**
 * Environment schema for backend runtime configuration.
 *
 * @remarks
 * Parsing happens at startup. Missing/invalid required variables fail fast.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  IMAGE_PATH: z.string().default("./uploads"),
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
  IP_HASH_SALT: z
    .string()
    .min(16, "IP_HASH_SALT must be at least 16 characters")
    .default("local-dev-salt-not-for-production"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("hallo@lmaa.space"),
  DASHBOARD_URL: z.string().url().default("https://dashboard.lmaa.space"),
  OWNER_EMAIL: z.string().email().optional(),
  UMAMI_URL: z.string().optional().default(""),
  UMAMI_USERNAME: z.string().optional().default(""),
  UMAMI_PASSWORD: z.string().optional().default(""),
  UMAMI_WEBSITE_ID: z.string().optional().default(""),
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

/**
 * Validated backend environment configuration.
 *
 * @throws {z.ZodError} When required environment variables are missing/invalid.
 */
export const env = envSchema.parse(process.env);
