import type { FormConfig, FormField } from "@lmaa/contracts";

/** Plain text values managed by react-hook-form. */
export type SimpleFields = Record<string, string>;

export interface DynamicFormMultiSelectState {
  categoryIds: number[];
  regionCodes: string[];
  staticMultiSelects: Record<string, string[]>;
}

const NON_SUBMIT_FIELD_TYPES = new Set(["richtext", "button", "headline", "separator", "paragraph"]);

/**
 * Returns the backend submission key for a field.
 */
export function fieldKey(field: FormField): string {
  return field.name ?? field.id;
}

/**
 * Builds the generic form submission payload from scalar and multi-select state.
 */
export function buildDynamicFormPayload(
  formConfig: FormConfig,
  data: SimpleFields,
  multiSelectState: DynamicFormMultiSelectState,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const row of formConfig.rows) {
    for (const field of row.fields) {
      if (NON_SUBMIT_FIELD_TYPES.has(field.type)) {
        continue;
      }

      const key = fieldKey(field);
      if (field.type === "multi-select") {
        if (field.optionsSource === "categories") {
          payload[key] = multiSelectState.categoryIds;
        } else if (field.optionsSource === "regions") {
          payload[key] = multiSelectState.regionCodes;
        } else {
          payload[key] = multiSelectState.staticMultiSelects[key] ?? [];
        }
        continue;
      }

      const value = data[key];
      if (value !== undefined && value !== "") {
        payload[key] = value;
      }
    }
  }

  return payload;
}

/**
 * Validates required multi-select fields that are not managed by react-hook-form.
 */
export function getRequiredMultiSelectErrors(
  formConfig: FormConfig,
  multiSelectState: DynamicFormMultiSelectState,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const row of formConfig.rows) {
    for (const field of row.fields) {
      if (field.type !== "multi-select" || !field.required) continue;

      const key = fieldKey(field);
      if (field.optionsSource === "categories") {
        if (multiSelectState.categoryIds.length === 0) {
          errors[key] = `${field.label} ist ein Pflichtfeld`;
        }
      } else if (field.optionsSource === "regions") {
        if (multiSelectState.regionCodes.length === 0) {
          errors[key] = `${field.label} ist ein Pflichtfeld`;
        }
      } else if ((multiSelectState.staticMultiSelects[key] ?? []).length === 0) {
        errors[key] = `${field.label} ist ein Pflichtfeld`;
      }
    }
  }

  return errors;
}
