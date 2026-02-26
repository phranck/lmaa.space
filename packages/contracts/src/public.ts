import { z } from "zod";
import { defaultRegionArraySchema } from "./common";

export const submissionSchema = z.object({
  shopName: z.string().min(2).max(100),
  shopUrl: z.string().url(),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  categorySuggestion: z.string().max(100).optional(),
  region: defaultRegionArraySchema,
  shipping: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  submitterEmail: z.string().email().optional(),
  submitterNote: z.string().max(500).optional(),
});
