import { z } from "zod";

import { SOCIAL_PLATFORM_KEYS, type SocialPlatformKey } from "@lmaa/shared";

/**
 * All supported social media platform keys, sourced from `@lmaa/shared`.
 */
export const SOCIAL_MEDIA_PLATFORM_KEYS = SOCIAL_PLATFORM_KEYS;

export type SocialMediaPlatformKey = SocialPlatformKey;

export const socialMediaPlatformSchema = z.enum(SOCIAL_MEDIA_PLATFORM_KEYS);

export const POSTING_PLATFORM_KEYS = ["mastodon", "bluesky"] as const satisfies readonly SocialMediaPlatformKey[];

export type PostingPlatformKey = (typeof POSTING_PLATFORM_KEYS)[number];

export const postingPlatformSchema = z.enum(POSTING_PLATFORM_KEYS);

// ─── Mastodon-specific constants ─────────────────────────────────────────────

export const mastodonVisibilitySchema = z.enum(["public", "unlisted", "private", "direct"]);

export type MastodonVisibility = z.infer<typeof mastodonVisibilitySchema>;

export const MASTODON_DEFAULT_MAX_POST_CHARACTERS = 500;
export const MASTODON_MAX_POST_CHARACTERS_LIMIT = 11000;

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

// ─── Bluesky-specific constants ──────────────────────────────────────────────

export const BLUESKY_PDS_URL = "https://bsky.social";
export const BLUESKY_FIXED_MAX_POST_CHARACTERS = 300;

const BLUESKY_HANDLE_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const BLUESKY_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidBlueskyIdentifier(value: string): boolean {
  return BLUESKY_HANDLE_PATTERN.test(value) || BLUESKY_EMAIL_PATTERN.test(value);
}

// ─── Account DTO ─────────────────────────────────────────────────────────────

export interface SocialMediaAccount {
  id: number;
  platform: SocialMediaPlatformKey;
  label: string;
  profileUrl: string;
  canPost: boolean;
  showInFooter: boolean;
  isActive: boolean;
  // Posting-only fields, populated when canPost = true:
  instanceUrl: string | null;
  username: string | null;
  handle: string | null;
  hasAccessToken: boolean;
  visibility: MastodonVisibility | null;
  maxPostCharacters: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Create/Update input schemas ─────────────────────────────────────────────

const accountInputBase = z.object({
  platform: socialMediaPlatformSchema,
  label: z.string().trim().min(1).max(100),
  profileUrl: z.string().trim().url().max(500),
  canPost: z.boolean().default(false),
  showInFooter: z.boolean().default(true),
  isActive: z.boolean().default(true),
  // Optional posting fields. Required by superRefine when canPost = true.
  instanceUrl: z.string().trim().url().max(500).optional(),
  username: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .optional()
    .transform((value) => (value ? value : undefined)),
  accessToken: z.string().trim().min(1).max(4096).optional(),
  appPassword: z.string().trim().min(1).max(200).optional(),
  visibility: mastodonVisibilitySchema.optional(),
  maxPostCharacters: z
    .number()
    .int()
    .min(1)
    .max(MASTODON_MAX_POST_CHARACTERS_LIMIT)
    .optional(),
});

type AccountInputBase = z.infer<typeof accountInputBase>;

function refinePostingInvariants(
  data: AccountInputBase,
  ctx: z.RefinementCtx,
  options: { tokenRequired: boolean },
): void {
  if (!data.canPost) return;
  if (data.platform !== "mastodon" && data.platform !== "bluesky") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["canPost"],
      message: "Posting is only available for Mastodon and Bluesky accounts.",
    });
    return;
  }
  if (data.platform === "mastodon") {
    if (!data.instanceUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["instanceUrl"],
        message: "instanceUrl is required when canPost is true for Mastodon.",
      });
    }
    if (options.tokenRequired && !data.accessToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accessToken"],
        message: "accessToken is required when canPost is true for Mastodon.",
      });
    }
    if (data.maxPostCharacters === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxPostCharacters"],
        message: "maxPostCharacters is required when canPost is true.",
      });
    }
  }
  if (data.platform === "bluesky") {
    if (!data.handle || !isValidBlueskyIdentifier(data.handle)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["handle"],
        message:
          "Must be a Bluesky handle (e.g. you.bsky.social) or email when canPost is true.",
      });
    }
    if (options.tokenRequired && !data.appPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appPassword"],
        message: "appPassword is required when canPost is true for Bluesky.",
      });
    }
  }
}

export const socialMediaAccountCreateSchema = accountInputBase.superRefine((data, ctx) => {
  refinePostingInvariants(data, ctx, { tokenRequired: true });
});

export const socialMediaAccountUpdateSchema = accountInputBase.partial().superRefine((data, ctx) => {
  if (data.canPost === undefined) return;
  refinePostingInvariants(data as AccountInputBase, ctx, { tokenRequired: false });
});

export type SocialMediaAccountCreateInput = z.infer<typeof socialMediaAccountCreateSchema>;
export type SocialMediaAccountUpdateInput = z.infer<typeof socialMediaAccountUpdateSchema>;
