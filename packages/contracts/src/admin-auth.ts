import { z } from "zod";

/**
 * Login payload contract.
 */
export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

/**
 * Validation schema for the initial owner setup payload.
 */
export const setupSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});
