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
  | "richtext"
  | "button"
  | "password"
  | "headline"
  | "separator"
  | "paragraph";

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
 * The type of action a `buttonType === "button"` field performs when clicked.
 *
 * - `"open-url"`       — opens the source field value as a URL in a new tab
 * - `"copy-clipboard"` — copies the source field value to the clipboard
 * - `"clear-field"`    — clears the source field value
 */
export type ButtonActionType = "open-url" | "copy-clipboard" | "clear-field";

/**
 * Defines a click action for a button field that reads or modifies another field.
 * Only meaningful when `buttonType === "button"`.
 */
export interface ButtonAction {
  type: ButtonActionType;
  /** ID of the field whose value is read or modified. */
  sourceFieldId: string;
}

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
  /** Unique identifier used as React key and internal reference. */
  id: string;
  /**
   * Variable name sent to the backend as the submission key.
   * Falls back to `id` if omitted.
   */
  name?: string;
  type: FieldType;
  label: string; // may be empty for icon-only buttons
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
  /**
   * Column span in a 12-column grid row layout.
   * Defaults to 12 (full width) if omitted.
   */
  span?: number;
  validation?: FormFieldValidation;
  /**
   * Number of visible rows for `textarea` and `richtext` fields.
   * Defaults to 4 for textarea, 8 for richtext if omitted.
   */
  rows?: number;
  /**
   * HTML `type` attribute for `button` fields.
   * Defaults to `"button"` if omitted.
   */
  buttonType?: "button" | "submit" | "reset";
  /** Width of the button. Defaults to `"automatic"`. */
  buttonWidth?: "automatic" | "full";
  /** Horizontal alignment of the button within its cell. Defaults to `"left"`. */
  buttonAlign?: "left" | "center" | "right";
  /**
   * SF Symbol component name for the button icon (e.g. `"SFArrowRight"`).
   * Omit or leave undefined for no icon.
   */
  buttonIcon?: string;
  /**
   * How the button renders its content.
   * - `"text"` — label only (default when no icon is set)
   * - `"icon"` — icon only (requires `buttonIcon`)
   * - `"both"` — icon + label (default when `buttonIcon` is set)
   */
  buttonDisplay?: "text" | "icon" | "both";
  /**
   * Heading level for `headline` fields.
   * Defaults to `"h2"` if omitted.
   */
  headlineLevel?: "h1" | "h2" | "h3";
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
  /**
   * Optional help text shown below the input in small print.
   * Supported for text, email, password and textarea fields.
   */
  subtext?: string;
  /**
   * Optional action triggered when a `buttonType === "button"` button is clicked.
   * Reads or modifies the value of another field in the same form.
   */
  buttonAction?: ButtonAction;
}

/**
 * A horizontal row containing one or two fields.
 */
export interface FormRow {
  id: string;
  /** Fields in this row, arranged in a 12-column grid via `span`. */
  fields: FormField[];
}

// ---------------------------------------------------------------------------
// Submission chain
// ---------------------------------------------------------------------------

export interface SubmissionStepStore {
  type: "store";
}

export interface SubmissionStepEmail {
  type: "email";
  /** Static recipient address. Used when `toFieldId` is not set. */
  to: string;
  /**
   * ID of a form field whose value is used as the recipient address at runtime.
   * Takes precedence over `to` when set.
   */
  toFieldId?: string;
  subject?: string;
  /** ID of a form field whose value is used as Reply-To header. */
  replyToFieldId?: string;
}

/**
 * Creates a shop suggestion (row in `submissions`) from form data.
 * Field values are read by variable name: shopName, shopUrl, categorySuggestion,
 * region, pickup, shipping, description, submitterEmail, submitterNote.
 */
export interface SubmissionStepCreateShopSuggestion {
  type: "create-shop-suggestion";
}

export type SubmissionStep = SubmissionStepStore | SubmissionStepEmail | SubmissionStepCreateShopSuggestion;

export interface SubmissionConfig {
  steps: SubmissionStep[];
  /** Overrides the default "Vielen Dank" success message. */
  successMessage?: string;
  /** Redirect to this URL after submit instead of showing the success screen. */
  successRedirectUrl?: string;
}

// ---------------------------------------------------------------------------
// Form configuration
// ---------------------------------------------------------------------------

/**
 * Complete form configuration as stored in the database.
 */
export interface FormConfig {
  id: number;
  name: string;
  /** Editable URL path. Defaults to `name` on creation. Forms are rendered at `/:slug`. */
  slug: string | null;
  rows: FormRow[];
  isActive: boolean;
  submissionConfig?: SubmissionConfig;
}

/**
 * The JSON payload stored in the `config` column.
 * `slug` is used to update the dedicated slug column on the backend.
 */
export interface FormConfigPayload {
  slug?: string;
  rows: FormRow[];
  submissionConfig?: SubmissionConfig;
}
