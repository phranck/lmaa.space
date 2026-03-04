import { z } from "zod";

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  headerBannerUrl?: string | null;
  headerText?: string | null;
  bodyText: string;
  footerBannerUrl?: string | null;
  footerText?: string | null;
  isSystemTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmailTemplateInput = Omit<
  EmailTemplate,
  "id" | "createdAt" | "updatedAt" | "isSystemTemplate"
>;

/**
 * Email template create payload contract.
 */
export const emailTemplateCreateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  headerBannerUrl: z.string().url().optional().or(z.literal("")),
  headerText: z.string().max(50000).optional(),
  bodyText: z.string().max(50000),
  footerBannerUrl: z.string().url().optional().or(z.literal("")),
  footerText: z.string().max(50000).optional(),
});

/**
 * Email template update payload contract.
 */
export const emailTemplateUpdateSchema = emailTemplateCreateSchema.partial().extend({
  subject: z.string().min(1).max(500).optional(),
  bodyText: z.string().max(50000).optional(),
});

/**
 * Email template preview payload contract.
 */
export const emailTemplatePreviewSchema = z.object({
  headerBannerUrl: z.string().nullish(),
  headerText: z.string().nullish(),
  bodyText: z.string().default(""),
  footerText: z.string().nullish(),
  footerBannerUrl: z.string().nullish(),
  colorScheme: z.enum(["light", "dark"]).default("light"),
});

/**
 * Email template import payload contract.
 */
export const emailTemplateImportSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  headerBannerUrl: z.string().url().or(z.literal("")).nullish(),
  headerText: z.string().max(50000).nullish(),
  bodyText: z.string().max(50000),
  footerBannerUrl: z.string().url().or(z.literal("")).nullish(),
  footerText: z.string().max(50000).nullish(),
  isSystemTemplate: z.boolean().optional(),
  overwrite: z.boolean().default(false),
});
