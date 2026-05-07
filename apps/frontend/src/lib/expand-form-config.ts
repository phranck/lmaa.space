import type { FormConfig, FormField, FormRow } from "@lmaa/contracts";
import { expandTextTokens } from "@lmaa/shared";

function expandField(field: FormField): FormField {
  return {
    ...field,
    label: expandTextTokens(field.label),
    placeholder: expandTextTokens(field.placeholder),
    subtext: expandTextTokens(field.subtext),
    content: expandTextTokens(field.content),
    options: field.options?.map((opt) => expandTextTokens(opt)),
  };
}

function expandRow(row: FormRow): FormRow {
  return { ...row, fields: row.fields.map(expandField) };
}

/**
 * Returns a copy of the form config with token notations (`U+XXXX`, `{nbhy}`,
 * `&#8209;`, …) expanded in all plain-text fields. Markdown-bearing fields
 * (`successMessage`, richtext `content`) are also expanded — token syntax does
 * not collide with Markdown.
 */
export function expandFormConfigText(config: FormConfig): FormConfig {
  return {
    ...config,
    rows: config.rows.map(expandRow),
    submissionConfig: config.submissionConfig
      ? {
          ...config.submissionConfig,
          successHeadline: expandTextTokens(config.submissionConfig.successHeadline),
          successMessage: expandTextTokens(config.submissionConfig.successMessage),
        }
      : config.submissionConfig,
  };
}
