import { z } from "zod";

/**
 * User creation payload contract (extends setupSchema pattern).
 */
export const createUserSchema = z.object({
  username: z.string().min(1).max(64),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "moderator"]).optional(),
  welcomeTemplateId: z.number().int().positive().optional(),
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
