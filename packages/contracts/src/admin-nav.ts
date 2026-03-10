import { z } from "zod";

import { isSafeConfiguredUrl } from "./safe-url.js";

/**
 * Navigation items replacement payload contract.
 */
export const navItemsSchema = z.object({
  items: z.array(
    z.object({
      pageSlug: z.string().min(1).nullish(),
      url: z
        .string()
        .min(1)
        .refine((value) => isSafeConfiguredUrl(value, { allowRelative: true, allowMailto: true }), {
          message: "url must be a relative path or a safe URL",
        })
        .nullish(),
      label: z.string().max(100).nullish(),
      target: z.enum(["_self", "_blank"]).default("_self"),
    }),
  ),
});
