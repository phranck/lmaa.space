import { z } from "zod";

export const mediaFolderColorSchema = z.enum([
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray",
]);

/**
 * Media metadata update payload contract.
 */
export const mediaUpdateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  alias: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(100)
      .nullable()
      .optional(),
  ),
  folderId: z.number().int().nullable().optional(),
});

export const mediaFolderCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((value) => !value.includes("/"), { message: "Folder names cannot contain '/'." }),
  parentId: z.number().int().nullable(),
  assetIds: z.array(z.number().int()).optional(),
});

export const mediaFolderUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine((value) => !value.includes("/"), { message: "Folder names cannot contain '/'." })
      .optional(),
    parentId: z.number().int().nullable().optional(),
    color: mediaFolderColorSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.parentId !== undefined || value.color !== undefined,
    { message: "Either name, parentId or color must be provided." },
  );

export type MediaFolderCreateInput = z.infer<typeof mediaFolderCreateSchema>;
export type MediaFolderUpdateInput = z.infer<typeof mediaFolderUpdateSchema>;
