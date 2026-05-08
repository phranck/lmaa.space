import { z } from "zod";

export const mastodonVisibilitySchema = z.enum(["public", "unlisted", "private", "direct"]);

export type MastodonVisibility = z.infer<typeof mastodonVisibilitySchema>;

export const MASTODON_POST_TEMPLATE_VARIABLES = [
  "shopName",
  "shopUrl",
  "shopDescription",
  "shopRegion",
  "shopShipping",
  "shopPickup",
  "shopContactEmail",
  "shopCategories",
  "shopPageUrl",
  "adminNote",
  "frontendUrl",
  "dashboardUrl",
] as const;

export type MastodonPostTemplateVariable = (typeof MASTODON_POST_TEMPLATE_VARIABLES)[number];

export const MASTODON_DEFAULT_MAX_POST_CHARACTERS = 500;
export const MASTODON_MAX_POST_CHARACTERS_LIMIT = 11000;

export interface MastodonAccount {
  id: number;
  label: string;
  instanceUrl: string;
  username: string | null;
  visibility: MastodonVisibility;
  maxPostCharacters: number;
  isActive: boolean;
  hasAccessToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export const mastodonAccountCreateSchema = z.object({
  label: z.string().trim().min(1).max(100),
  instanceUrl: z.string().trim().url().max(500),
  username: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  accessToken: z.string().trim().min(1).max(4096),
  visibility: mastodonVisibilitySchema.default("public"),
  maxPostCharacters: z
    .number()
    .int()
    .min(1)
    .max(MASTODON_MAX_POST_CHARACTERS_LIMIT)
    .default(MASTODON_DEFAULT_MAX_POST_CHARACTERS),
  isActive: z.boolean().default(true),
});

export const mastodonAccountUpdateSchema = mastodonAccountCreateSchema
  .omit({ accessToken: true })
  .partial()
  .extend({
    accessToken: z
      .string()
      .trim()
      .max(4096)
      .optional()
      .transform((value) => value || undefined),
  });

