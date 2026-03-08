import { z } from "zod";

/**
 * Media metadata update payload contract.
 */
export const mediaUpdateSchema = z.object({
  displayName: z.string().min(1).max(200),
});
