/**
 * Supported form field input types.
 * `richtext` is a display-only block (not a form input) — renders stored markdown as styled HTML.
 */
export type FieldType =
  | "text"
  | "email"
  | "textarea"
  | "select"
  | "multi-select"
  | "checkbox"
  | "richtext";

/**
 * Visual style variants for richtext blocks.
 *
 * - `default` — neutral card
 * - `info`    — blue info box
 * - `warning` — amber warning box
 * - `hint`    — green hint/tip box
 */
export type RichTextVariant = "default" | "info" | "warning" | "hint";

/**
 * Dynamic option source for fields whose options are loaded at runtime.
 *
 * - `"categories"` — options come from the shop category list
 * - `"regions"` — options are the fixed region codes (DE, AT, CH, EU)
 */
export type FieldOptionsSource = "categories" | "regions";

/**
 * Field-level validation constraints.
 */
export interface FormFieldValidation {
  min?: number;
  max?: number;
  /** Regex pattern string (used with `new RegExp(pattern)`). */
  pattern?: string;
}

/**
 * A single configurable form field.
 */
export interface FormField {
  /** Unique identifier — doubles as the `name` attribute and submission key. */
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  /**
   * Static options for `select` and `multi-select` fields.
   * Ignored when `optionsSource` is set.
   */
  options?: string[];
  /**
   * Dynamic option source loaded at render time.
   * Overrides `options` when present.
   */
  optionsSource?: FieldOptionsSource;
  /** Column width in a two-column row layout. */
  width: "full" | "half";
  validation?: FormFieldValidation;
  /**
   * Markdown content for `richtext` blocks.
   * Ignored for all other field types.
   */
  content?: string;
  /**
   * Visual variant for `richtext` blocks.
   * Ignored for all other field types.
   */
  variant?: RichTextVariant;
}

/**
 * A horizontal row containing one or two fields.
 */
export interface FormRow {
  id: string;
  /** Max two fields per row. A single field uses `width: "full"`. */
  fields: FormField[];
}

/**
 * Complete form configuration as stored in the database.
 */
export interface FormConfig {
  id: number;
  name: string;
  rows: FormRow[];
  isActive: boolean;
}

/**
 * The JSON payload stored in the `config` column (rows only).
 */
export interface FormConfigPayload {
  rows: FormRow[];
}
