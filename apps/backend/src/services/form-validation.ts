import { z } from "zod";

import type { FormField, FormRow } from "@lmaa/contracts";

const DISPLAY_FIELD_TYPES = new Set(["richtext", "headline", "separator", "paragraph", "button"]);

function buildFieldSchema(field: FormField): z.ZodTypeAny | null {
  if (DISPLAY_FIELD_TYPES.has(field.type)) return null;

  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "text":
    case "email":
    case "textarea":
    case "password":
    case "select": {
      let s = z.string();
      if (field.validation?.min != null) s = s.min(field.validation.min);
      if (field.validation?.max != null) s = s.max(field.validation.max);
      if (field.validation?.pattern) s = s.regex(new RegExp(field.validation.pattern));
      schema = s;
      break;
    }
    case "multi-select":
      schema = z.array(z.union([z.string(), z.number()]));
      break;
    case "checkbox":
      schema = z.union([z.boolean(), z.string()]);
      break;
    default:
      return null;
  }

  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Builds a Zod validation schema from a form's row/field configuration.
 *
 * Display-only field types (richtext, headline, separator, paragraph, button) are skipped.
 * Uses `field.name ?? field.id` as the schema key.
 *
 * @param rows - Array of `FormRow` objects from the form configuration.
 * @returns A `z.ZodObject` matching the expected form submission shape.
 */
export function buildFormValidationSchema(rows: FormRow[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  for (const row of rows) {
    for (const field of row.fields) {
      const fieldSchema = buildFieldSchema(field);
      if (!fieldSchema) continue;
      const name = field.name ?? field.id;
      shape[name] = fieldSchema;
    }
  }

  return z.object(shape);
}
