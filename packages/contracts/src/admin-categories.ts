import { z } from "zod";

export const templateAssignmentSchema = z.object({
  accountId: z.number().int().positive(),
  templateId: z.number().int().positive().nullable(),
});
export type TemplateAssignment = z.infer<typeof templateAssignmentSchema>;

/**
 * Category base contract (fields shared by create and update).
 */
export const categoryBodySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  icon: z.string().max(10).optional(),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
  imageUrl: z.string().url().nullable().optional(),
  imagePhotographer: z.string().max(200).nullable().optional(),
  imagePhotographerUrl: z.string().url().nullable().optional(),
});

/**
 * Category create payload contract — accepts optional social-media post
 * template assignments that fire on successful create.
 */
export const categoryCreateSchema = categoryBodySchema.extend({
  templateAssignments: z.array(templateAssignmentSchema).optional(),
});

/**
 * Category partial update payload — does NOT accept templateAssignments
 * (posting only fires on create).
 */
export const categoryUpdateSchema = categoryBodySchema.partial();
