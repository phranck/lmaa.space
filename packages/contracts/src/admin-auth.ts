import { z } from "zod";

/**
 * Login payload contract.
 */
export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
