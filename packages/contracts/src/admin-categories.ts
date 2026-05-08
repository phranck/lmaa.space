import { z } from "zod";

export const templateAssignmentSchema = z.object({
  accountId: z.number().int().positive(),
  templateId: z.number().int().positive().nullable(),
});
export type TemplateAssignment = z.infer<typeof templateAssignmentSchema>;

/**
 * Category create payload contract for admin routes.
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
  templateAssignments: z.array(templateAssignmentSchema).optional(),
});

/**
 * Category partial update payload contract for admin routes.
 */
export const categoryUpdateSchema = categoryBodySchema.partial();
