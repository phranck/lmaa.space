import { z } from "zod";

const slugPattern = /^[a-z0-9-]+$/;
export const contentWidthSchema = z.enum(["default", "wide", "full"]);

/**
 * Content body update payload contract.
 */
export const contentUpdateSchema = z.object({
  content: z.string().max(100_000),
});

/**
 * Short-lived content page preview payload.
 */
export const contentPreviewSessionSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(slugPattern, "Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt"),
  title: z.string().min(1).max(200),
  content: z.string().max(100_000),
  showTitle: z.boolean(),
  contentWidth: contentWidthSchema,
});

export type ContentPreviewSessionPayload = z.infer<typeof contentPreviewSessionSchema>;

export interface ContentPreviewSessionResponse {
  token: string;
  expiresAt: string;
}

/**
 * Content metadata update payload contract.
 */
export const contentMetaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(slugPattern, "Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt")
    .optional(),
  status: z.enum(["draft", "published", "hidden"]).optional(),
  showTitle: z.boolean().optional(),
  contentWidth: contentWidthSchema.optional(),
});

/**
 * Content create payload contract.
 */
export const contentCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(slugPattern, "Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt"),
  title: z.string().min(1).max(200),
  status: z.enum(["draft", "published", "hidden"]).optional(),
  contentWidth: contentWidthSchema.optional(),
});
