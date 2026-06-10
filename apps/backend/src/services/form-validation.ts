import { z } from "zod";

import type { FormField, FormRow } from "@lmaa/contracts";

const DISPLAY_FIELD_TYPES = new Set(["richtext", "headline", "separator", "paragraph", "button"]);

/** Default upper bound for text fields without an explicit `validation.max`, to cap storage abuse. */
const DEFAULT_FIELD_MAX_LENGTH = 5000;
/** Default element cap for multi-select fields, to bound unbounded array submissions. */
const DEFAULT_MULTI_SELECT_MAX = 100;
/** Maximum admin-defined pattern length compiled to RegExp, to limit ReDoS exposure. */
const MAX_VALIDATION_PATTERN_LENGTH = 200;

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
      if (field.type === "email") s = s.email();
      if (field.validation?.min != null) s = s.min(field.validation.min);
      // Always cap length: an explicit max if configured, otherwise a sane default.
      s = s.max(field.validation?.max ?? DEFAULT_FIELD_MAX_LENGTH);
      if (
        field.validation?.pattern &&
        field.validation.pattern.length <= MAX_VALIDATION_PATTERN_LENGTH
      ) {
        try {
          s = s.regex(new RegExp(field.validation.pattern));
        } catch {
          // Ignore an invalid admin-authored pattern rather than crashing validation.
        }
      }
      schema = s;
      break;
    }
    case "multi-select":
      schema = z.array(z.union([z.string(), z.number()])).max(DEFAULT_MULTI_SELECT_MAX);
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
