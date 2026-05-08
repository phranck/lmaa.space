import { z } from "zod";

import { MASTODON_POST_TEMPLATE_VARIABLES, type MastodonPostTemplateVariable } from "./admin-mastodon.js";

export const SOCIAL_MEDIA_PLATFORMS = ["mastodon", "bluesky"] as const;
export type SocialMediaPlatform = (typeof SOCIAL_MEDIA_PLATFORMS)[number];

export const MASTODON_BODY_MAX = 500;
export const BLUESKY_BODY_MAX = 300;

export interface SocialMediaPostTemplate {
  id: number;
  name: string;
  platforms: SocialMediaPlatform[];
  bodyMastodon: string | null;
  bodyBluesky: string | null;
  isSystemTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SocialMediaPostTemplateInput = Omit<
  SocialMediaPostTemplate,
  "id" | "createdAt" | "updatedAt" | "isSystemTemplate"
> & { isSystemTemplate?: boolean };

export const socialMediaPostTemplateCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    platforms: z.array(z.enum(SOCIAL_MEDIA_PLATFORMS)).min(1),
    bodyMastodon: z.string().max(MASTODON_BODY_MAX).nullable().optional(),
    bodyBluesky: z.string().max(BLUESKY_BODY_MAX).nullable().optional(),
    isSystemTemplate: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.platforms.includes("mastodon") && !value.bodyMastodon) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodyMastodon"],
        message: "bodyMastodon is required when 'mastodon' is in platforms",
      });
    }
    if (value.platforms.includes("bluesky") && !value.bodyBluesky) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodyBluesky"],
        message: "bodyBluesky is required when 'bluesky' is in platforms",
      });
    }
  });

export const socialMediaPostTemplateUpdateSchema = socialMediaPostTemplateCreateSchema;

export const SOCIAL_MEDIA_POST_TEMPLATE_VARIABLES = MASTODON_POST_TEMPLATE_VARIABLES;
export type SocialMediaPostTemplateVariable = MastodonPostTemplateVariable;
