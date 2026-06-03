import { z } from "zod";

export const SOCIAL_PREVIEW_FORMATS = ["image/jpeg", "image/png", "image/webp"] as const;
export type SocialPreviewFormat = (typeof SOCIAL_PREVIEW_FORMATS)[number];

export const socialPreviewTextAlignSchema = z.enum(["left", "center", "right"]);

const socialPreviewBaseLayerSchema = z.object({
  id: z.string().min(1).max(100),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
});

export const socialPreviewTextLayerSchema = socialPreviewBaseLayerSchema.extend({
  type: z.literal("text"),
  text: z.string().max(2000),
  fontFamily: z.string().min(1).max(120),
  fontSize: z.number().positive().max(400),
  fontWeight: z.string().max(40),
  fontStyle: z.string().max(40),
  color: z.string().max(40),
  align: socialPreviewTextAlignSchema,
  lineHeight: z.number().positive().max(4),
  letterSpacing: z.number().min(-20).max(100),
});

export const socialPreviewImageLayerSchema = socialPreviewBaseLayerSchema.extend({
  type: z.literal("image"),
  src: z.string().url().max(2000),
  alt: z.string().max(300).nullable().optional(),
});

export const socialPreviewLayerSchema = z.discriminatedUnion("type", [
  socialPreviewTextLayerSchema,
  socialPreviewImageLayerSchema,
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
