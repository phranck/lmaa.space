import { describe, expect, it } from "vitest";

import type { FormField, FormRow } from "@lmaa/contracts";

import { buildFormValidationSchema } from "../services/form-validation.js";

function row(...fields: FormField[]): FormRow {
  return { id: "row-1", fields };
}

function field(overrides: Partial<FormField> & { type: FormField["type"] }): FormField {
  return { id: "f1", label: "Label", required: true, ...overrides };
}

describe("buildFormValidationSchema", () => {
  it("builds schema for a required text field", () => {
    const schema = buildFormValidationSchema([row(field({ type: "text" }))]);
    expect(schema.safeParse({ f1: "hello" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("uses field.name as key when present", () => {
    const schema = buildFormValidationSchema([row(field({ type: "text", name: "username" }))]);
    expect(schema.safeParse({ username: "alice" }).success).toBe(true);
    expect(schema.safeParse({ f1: "alice" }).success).toBe(false);
  });

  it("falls back to field.id when name is absent", () => {
    const schema = buildFormValidationSchema([row(field({ type: "text", id: "myField" }))]);
    expect(schema.safeParse({ myField: "val" }).success).toBe(true);
  });

  it("makes optional fields non-required", () => {
    const schema = buildFormValidationSchema([row(field({ type: "text", required: false }))]);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ f1: "val" }).success).toBe(true);
  });

  it("applies min validation", () => {
    const schema = buildFormValidationSchema([
      row(field({ type: "text", validation: { min: 3 } })),
    ]);
    expect(schema.safeParse({ f1: "ab" }).success).toBe(false);
    expect(schema.safeParse({ f1: "abc" }).success).toBe(true);
  });

  it("applies max validation", () => {
    const schema = buildFormValidationSchema([
      row(field({ type: "text", validation: { max: 5 } })),
    ]);
    expect(schema.safeParse({ f1: "123456" }).success).toBe(false);
    expect(schema.safeParse({ f1: "12345" }).success).toBe(true);
  });

  it("applies pattern validation", () => {
    const schema = buildFormValidationSchema([
      row(field({ type: "text", validation: { pattern: "^[A-Z]+$" } })),
    ]);
    expect(schema.safeParse({ f1: "ABC" }).success).toBe(true);
    expect(schema.safeParse({ f1: "abc" }).success).toBe(false);
  });

  it("handles email field type as string", () => {
    const schema = buildFormValidationSchema([row(field({ type: "email" }))]);
    expect(schema.safeParse({ f1: "test@example.com" }).success).toBe(true);
    expect(schema.safeParse({ f1: 42 }).success).toBe(false);
  });

  it("handles textarea field type as string", () => {
    const schema = buildFormValidationSchema([row(field({ type: "textarea" }))]);
    expect(schema.safeParse({ f1: "long text" }).success).toBe(true);
  });

  it("handles password field type as string", () => {
    const schema = buildFormValidationSchema([row(field({ type: "password" }))]);
    expect(schema.safeParse({ f1: "secret" }).success).toBe(true);
  });

  it("handles select field type as string", () => {
    const schema = buildFormValidationSchema([row(field({ type: "select" }))]);
    expect(schema.safeParse({ f1: "option-a" }).success).toBe(true);
  });

  it("handles multi-select as array of strings or numbers", () => {
    const schema = buildFormValidationSchema([row(field({ type: "multi-select" }))]);
    expect(schema.safeParse({ f1: ["a", "b"] }).success).toBe(true);
    expect(schema.safeParse({ f1: [1, 2] }).success).toBe(true);
    expect(schema.safeParse({ f1: "single" }).success).toBe(false);
  });

  it("handles checkbox as boolean or string", () => {
    const schema = buildFormValidationSchema([row(field({ type: "checkbox" }))]);
    expect(schema.safeParse({ f1: true }).success).toBe(true);
    expect(schema.safeParse({ f1: "on" }).success).toBe(true);
    expect(schema.safeParse({ f1: 42 }).success).toBe(false);
  });

  it("skips display-only field types", () => {
    const displayTypes = ["richtext", "headline", "separator", "paragraph", "button"] as const;
    for (const type of displayTypes) {
      const schema = buildFormValidationSchema([row(field({ type }))]);
      expect(schema.safeParse({}).success).toBe(true);
    }
  });

  it("handles multiple rows with mixed fields", () => {
    const schema = buildFormValidationSchema([
      row(field({ type: "text", id: "name", name: "name" }), field({ type: "headline", id: "h1" })),
      row(
        field({ type: "checkbox", id: "agree", required: false }),
        field({ type: "separator", id: "sep" }),
      ),
    ]);
    expect(schema.safeParse({ name: "Alice" }).success).toBe(true);
    expect(schema.safeParse({ name: "Alice", agree: true }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("returns empty schema for no input fields", () => {
    const schema = buildFormValidationSchema([
      row(field({ type: "headline" })),
      row(field({ type: "separator" })),
    ]);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("returns empty schema for empty rows", () => {
    const schema = buildFormValidationSchema([]);
    expect(schema.safeParse({}).success).toBe(true);
  });
});
