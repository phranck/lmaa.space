import { z } from "zod";

export const BLUESKY_PDS_URL = "https://bsky.social";
export const BLUESKY_FIXED_MAX_POST_CHARACTERS = 300;

const HANDLE_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BlueskyAccount {
  id: number;
  label: string;
  handle: string;
  isActive: boolean;
  hasAccessToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export const blueskyAccountCreateSchema = z.object({
  label: z.string().trim().min(1).max(100),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (value) => HANDLE_PATTERN.test(value) || EMAIL_PATTERN.test(value),
      "Must be a BlueSky handle (e.g. you.bsky.social) or email address",
    ),
  appPassword: z.string().trim().min(1).max(200),
  isActive: z.boolean().default(true),
});

export const blueskyAccountUpdateSchema = blueskyAccountCreateSchema
  .omit({ appPassword: true })
  .partial()
  .extend({
    appPassword: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional()
      .transform((value) => value || undefined),
  });
