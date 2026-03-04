import { z } from "zod";

/**
 * Navigation items replacement payload contract.
 */
export const navItemsSchema = z.object({
  items: z.array(
    z.object({
      pageSlug: z.string().min(1).nullish(),
      url: z.string().min(1).nullish(),
      label: z.string().max(100).nullish(),
      target: z.enum(["_self", "_blank"]).default("_self"),
    }),
  ),
});
