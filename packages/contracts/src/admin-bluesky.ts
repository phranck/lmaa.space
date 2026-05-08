import { z } from "zod";

export const BLUESKY_PDS_URL = "https://bsky.social";
export const BLUESKY_FIXED_MAX_POST_CHARACTERS = 300;

const HANDLE_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const APP_PASSWORD_PATTERN = /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;

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
  handle: z.string().trim().toLowerCase().regex(HANDLE_PATTERN, "Invalid BlueSky handle"),
  appPassword: z
    .string()
    .trim()
    .regex(APP_PASSWORD_PATTERN, "App-Password format: xxxx-xxxx-xxxx-xxxx"),
  isActive: z.boolean().default(true),
});

export const blueskyAccountUpdateSchema = blueskyAccountCreateSchema
  .omit({ appPassword: true })
  .partial()
  .extend({
    appPassword: z
      .string()
      .trim()
      .regex(APP_PASSWORD_PATTERN)
      .optional()
      .transform((value) => value || undefined),
  });
