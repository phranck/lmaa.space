/**
 * Turns one submitted form value into the text that stands for it in an email,
 * a template variable or a stored column.
 *
 * Form values arrive as parsed JSON, so besides text they can be numbers,
 * booleans, the list a multi-choice field sends, or an object. A list reads as
 * its items separated by a comma and a space, and anything else that is not a
 * scalar is written as JSON, so no value is ever reduced to `[object Object]`.
 *
 * @param value - The submitted value, as parsed from the request body.
 * @returns The text for the value, or an empty string for `null` and `undefined`.
 */
export function formValueToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(formValueToText).join(", ");
  return JSON.stringify(value);
}
