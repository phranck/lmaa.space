import type { FieldControlSize } from "./FieldPrimitives.tsx";

export const fieldShellClass = "space-y-1";
export const fieldLabelClass = "block px-[5px] text-xs font-medium text-[var(--ds-text-subtle)]";
export const fieldOptionalClass = "font-normal text-[var(--ds-text-subtle)]";
export const fieldHelpClass = "text-xs text-[var(--ds-text-subtle)]";
export const fieldErrorClass = "text-xs text-red-500";
export const fieldControlBaseClass =
  "box-border rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-sm text-[var(--ds-text)] transition-colors placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-focus)] focus:ring-2 focus:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-[var(--ds-control-disabled-opacity)]";
export const fieldControlInvalidClass =
  "border-[var(--ds-danger-border)] focus:border-[var(--ds-danger-border)] focus:ring-[var(--ds-danger-border)]";

export const inputSizeClass: Record<FieldControlSize, string> = {
  field: "h-[var(--ds-control-h-field)] px-3",
  large: "h-[var(--ds-control-h-field-large)] px-4",
};

export const textareaSizeClass: Record<FieldControlSize, string> = {
  field: "min-h-[calc(var(--ds-control-h-field)*3)] px-3 py-1.5",
  large: "min-h-[calc(var(--ds-control-h-field-large)*3)] px-4 py-2",
};
