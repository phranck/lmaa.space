import { z } from "zod";

/**
 * User creation payload contract (extends setupSchema pattern).
 */
export const createUserSchema = z.object({
  username: z.string().min(1).max(64),
  email: z.string().email(),
  role: z.enum(["admin", "moderator"]).optional(),
  welcomeTemplateId: z.number().int().positive().optional(),
});

/**
 * Public invite lookup/accept payload.
 */
export const acceptInviteSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8),
});

/**
 * User update payload contract.
 */
export const updateUserSchema = z.object({
  username: z.string().min(1).max(64).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().max(64).optional(),
  lastName: z.string().max(64).optional(),
  locale: z.enum(["de", "en"]).optional(),
  role: z.enum(["admin", "moderator"]).optional(),
});

/**
 * Gravatar URL update payload contract.
 */
export const gravatarSchema = z.object({
  gravatarUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://www.gravatar.com/avatar/"), "Must be a Gravatar URL"),
});
