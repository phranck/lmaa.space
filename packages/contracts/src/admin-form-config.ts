import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, digits and hyphens only")
  .optional();

const formFieldValidationSchema = z
  .object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().positive().optional(),
    pattern: z.string().max(500).optional(),
  })
  .optional();

const buttonActionSchema = z.object({
  type: z.enum(["open-url", "copy-clipboard", "clear-field"]),
  sourceFieldId: z.string().min(1).max(100),
});

const submissionStepSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("store") }),
  z.object({ type: z.literal("create-shop-suggestion") }),
  z.object({
    type: z.literal("email"),
    to: z.string().max(500),
    toFieldId: z.string().max(100).optional(),
    subject: z.string().max(500).optional(),
    replyToFieldId: z.string().max(100).optional(),
    templateId: z.number().int().positive().optional(),
  }),
]);

const submissionConfigSchema = z.object({
  steps: z.array(submissionStepSchema),
  successHeadline: z.string().max(200).optional(),
  successMessage: z.string().max(1000).optional(),
  successRedirectUrl: z.string().max(2000).optional(),
});

const formFieldSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum([
    "text",
    "email",
    "textarea",
    "select",
    "multi-select",
    "checkbox",
    "richtext",
    "button",
    "password",
    "headline",
    "separator",
    "paragraph",
  ]),
  label: z.string().max(200),
  placeholder: z.string().max(200).optional(),
  required: z.boolean(),
  options: z.array(z.string().max(200)).optional(),
  optionsSource: z.enum(["categories", "regions"]).optional(),
  width: z.enum(["full", "half"]).optional(),
  span: z.number().int().min(1).max(12).optional(),
  validation: formFieldValidationSchema,
  content: z.string().max(50000).optional(),
  variant: z.enum(["default", "info", "warning", "hint"]).optional(),
  buttonType: z.enum(["button", "submit", "reset"]).optional(),
  buttonWidth: z.enum(["automatic", "full"]).optional(),
  buttonAlign: z.enum(["left", "center", "right"]).optional(),
  buttonIcon: z.string().max(100).optional(),
  buttonDisplay: z.enum(["text", "icon", "both"]).optional(),
  headlineLevel: z.enum(["h1", "h2", "h3"]).optional(),
  rows: z.number().int().min(1).max(20).optional(),
  name: z.string().max(200).optional(),
  subtext: z.string().max(500).optional(),
  buttonAction: buttonActionSchema.optional(),
  inputType: z.enum(["text", "password", "email", "url", "tel", "date", "number"]).optional(),
  allowMarkdown: z.boolean().optional(),
});

const formRowSchema = z.object({
  id: z.string().min(1).max(100),
  fields: z.array(formFieldSchema).min(1),
});

/**
 * Form config update payload contract.
 */
export const formConfigPayloadSchema = z.object({
  slug: slugSchema,
  rows: z.array(formRowSchema),
  submissionConfig: submissionConfigSchema.optional(),
});

/**
 * Form config creation payload contract.
 */
export const createFormConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Name must be lowercase letters, digits and hyphens only"),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, digits and hyphens only")
    .optional(),
});

/**
 * Form config import payload contract.
 */
/**
 * Form config active state toggle contract.
 */
export const formConfigActiveSchema = z.object({
  isActive: z.boolean(),
});

/**
 * Form config import payload contract.
 */
export const importFormConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Name must be lowercase letters, digits and hyphens only"),
  slug: slugSchema,
  rows: z.array(formRowSchema),
  submissionConfig: submissionConfigSchema.optional(),
  overwrite: z.boolean().optional(),
});
