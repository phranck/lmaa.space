import { z } from "zod";

export const SOCIAL_PREVIEW_FORMATS = ["image/jpeg", "image/png", "image/webp"] as const;
export type SocialPreviewFormat = (typeof SOCIAL_PREVIEW_FORMATS)[number];

export const socialPreviewTextAlignSchema = z.enum(["left", "center", "right"]);
export const socialPreviewShapeKindSchema = z.enum([
  "rectangle",
  "circle",
  "ellipse",
  "polygon",
  "star",
]);

const socialPreviewBaseLayerSchema = z.object({
  id: z.string().min(1).max(100),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
});

export const socialPreviewTextColorRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  color: z.string().max(40),
});

export const socialPreviewTextLayerSchema = socialPreviewBaseLayerSchema.extend({
  type: z.literal("text"),
  text: z.string().max(2000),
  fontFamily: z.string().min(1).max(120),
  fontSize: z.number().positive().max(400),
  fontWeight: z.string().max(40),
  fontStyle: z.string().max(40),
  color: z.string().max(40),
  colorRanges: z.array(socialPreviewTextColorRangeSchema).max(200).optional(),
  align: socialPreviewTextAlignSchema,
  lineHeight: z.number().positive().max(4),
  letterSpacing: z.number().min(-20).max(100),
});

export const socialPreviewImageLayerSchema = socialPreviewBaseLayerSchema.extend({
  type: z.literal("image"),
  src: z.string().url().max(2000),
  alt: z.string().max(300).nullable().optional(),
  zoom: z.number().min(0.1).max(10).optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
});

export const socialPreviewShapeLayerSchema = socialPreviewBaseLayerSchema.extend({
  type: z.literal("shape"),
  shape: socialPreviewShapeKindSchema,
  cornerRadius: z.number().min(0).max(1000),
  radius: z.number().positive().max(4096),
  sides: z.number().int().min(3).max(20),
  points: z.number().int().min(3).max(20),
  color: z.string().max(40),
  border: z.boolean(),
  borderColor: z.string().max(40),
  borderThickness: z.number().min(0).max(200),
  borderOpacity: z.number().min(0).max(1),
});

export const socialPreviewLayerSchema = z.discriminatedUnion("type", [
  socialPreviewTextLayerSchema,
  socialPreviewImageLayerSchema,
  socialPreviewShapeLayerSchema,
]);

export const socialPreviewCompositionSchema = z.object({
  version: z.literal(1),
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  background: z.object({
    src: z.string().url().max(2000).nullable(),
    color: z.string().max(40),
    zoom: z.number().min(0.1).max(10),
    offsetX: z.number(),
    offsetY: z.number(),
  }),
  layers: z.array(socialPreviewLayerSchema).max(80),
});

export type SocialPreviewComposition = z.infer<typeof socialPreviewCompositionSchema>;
export type SocialPreviewLayer = z.infer<typeof socialPreviewLayerSchema>;
export type SocialPreviewTextLayer = z.infer<typeof socialPreviewTextLayerSchema>;
export type SocialPreviewImageLayer = z.infer<typeof socialPreviewImageLayerSchema>;
export type SocialPreviewShapeLayer = z.infer<typeof socialPreviewShapeLayerSchema>;
export type SocialPreviewShapeKind = z.infer<typeof socialPreviewShapeKindSchema>;

export interface SocialPreviewProjectEntry {
  id: number;
  name: string;
  composition: SocialPreviewComposition;
  createdAt: string;
  updatedAt: string;
  createdByUsername: string | null;
}

export interface SocialPreviewImageEntry {
  id: number;
  name: string;
  imageUrl: string;
  mediaAssetId: number | null;
  composition: SocialPreviewComposition;
  width: number;
  height: number;
  format: SocialPreviewFormat;
  quality: number;
  sizeBytes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUsername: string | null;
}

export const socialPreviewProjectCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  composition: socialPreviewCompositionSchema,
});

export const socialPreviewProjectUpdateSchema = socialPreviewProjectCreateSchema
  .partial()
  .refine(
    (value) => value.name !== undefined || value.composition !== undefined,
    "At least one field must be provided",
  );

export const socialPreviewCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  imageUrl: z.string().url().max(2000),
  mediaAssetId: z.number().int().positive().nullable().optional(),
  composition: socialPreviewCompositionSchema,
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  format: z.enum(SOCIAL_PREVIEW_FORMATS),
  quality: z.number().int().min(1).max(100),
  sizeBytes: z.number().int().nonnegative(),
  activate: z.boolean().optional(),
});

export const socialPreviewActiveSchema = z.object({
  active: z.boolean(),
});
