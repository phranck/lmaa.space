import { z } from "zod";

/**
 * Login payload contract.
 */
export const loginSchema = z.object({
  username: z.string().min(1).max(256),
  // Generous upper bound to bound request size; bcrypt truncates at 72 bytes so
  // longer existing passwords still verify via the same truncation.
  password: z.string().min(1).max(200),
});

/**
 * Validation schema for the initial owner setup payload.
 */
export const setupSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  // Capped at 72 bytes: bcrypt silently truncates beyond that, so a longer value
  // would give a false sense of strength.
  password: z.string().min(8).max(72),
});
