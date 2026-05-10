import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import { cx } from "./classNames.ts";

export type FieldControlSize = "field" | "large";

export interface FieldShellControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}

export interface FieldShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label?: ReactNode;
  optionalLabel?: ReactNode;
  required?: boolean;
  error?: ReactNode;
  hint?: ReactNode;
  children: ReactNode | ((controlProps: FieldShellControlProps) => ReactNode);
  controlId?: string;
  labelClassName?: string;
  helpClassName?: string;
  errorClassName?: string;
}

export interface InputPrimitiveProps extends ComponentPropsWithoutRef<"input"> {
  controlSize?: FieldControlSize;
  invalid?: boolean;
}

export interface TextareaPrimitiveProps extends ComponentPropsWithoutRef<"textarea"> {
  controlSize?: FieldControlSize;
  invalid?: boolean;
}

const fieldShellClass = "space-y-1";
const fieldLabelClass = "block px-[5px] text-xs font-medium text-[var(--ds-text-subtle)]";
const fieldOptionalClass = "font-normal text-[var(--ds-text-subtle)]";
const fieldHelpClass = "text-xs text-[var(--ds-text-subtle)]";
const fieldErrorClass = "text-xs text-red-500";
const fieldControlBaseClass =
  "w-full box-border rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-sm text-[var(--ds-text)] transition-colors placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-focus)] focus:ring-2 focus:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-[var(--ds-control-disabled-opacity)]";
const fieldControlInvalidClass =
  "border-[var(--ds-danger-border)] focus:border-[var(--ds-danger-border)] focus:ring-[var(--ds-danger-border)]";

const inputSizeClass: Record<FieldControlSize, string> = {
  field: "h-[var(--ds-control-h-field)] px-3",
  large: "h-[var(--ds-control-h-field-large)] px-4",
};

const textareaSizeClass: Record<FieldControlSize, string> = {
  field: "min-h-[calc(var(--ds-control-h-field)*3)] px-3 py-1.5",
  large: "min-h-[calc(var(--ds-control-h-field-large)*3)] px-4 py-2",
};

function isFieldShellRenderFunction(
  children: FieldShellProps["children"],
): children is (controlProps: FieldShellControlProps) => ReactNode {
  return typeof children === "function";
}

function hasInvalidState(value: InputPrimitiveProps["aria-invalid"] | boolean | undefined) {
  return value === true || value === "true";
}

export function FieldShell({
  children,
  className,
  controlId,
  error,
  errorClassName,
  helpClassName,
  hint,
  label,
  labelClassName,
  optionalLabel,
  required,
  ...divProps
}: FieldShellProps) {
  const generatedId = useId();
  const id = controlId ?? generatedId;
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const controlProps: FieldShellControlProps = {
    id,
    ...(descriptionId ? { "aria-describedby": descriptionId } : {}),
    ...(error ? { "aria-invalid": true } : {}),
    ...(required ? { "aria-required": true } : {}),
  };

  return (
    <div {...divProps} className={cx(fieldShellClass, className)}>
      {label && (
        <label htmlFor={id} className={cx(fieldLabelClass, labelClassName)}>
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-[var(--ds-text-danger,#ef4444)]">
              *
            </span>
          )}
          {optionalLabel && !required && (
            <>
              {" "}
              <span className={fieldOptionalClass}>{optionalLabel}</span>
            </>
          )}
        </label>
      )}
      {isFieldShellRenderFunction(children) ? children(controlProps) : children}
      {error ? (
        <p id={descriptionId} className={cx(fieldErrorClass, errorClassName)}>
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className={cx(fieldHelpClass, helpClassName)}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function InputPrimitive({
  className,
  controlSize = "field",
  invalid,
  ...inputProps
}: InputPrimitiveProps) {
  const ariaInvalid = invalid ?? inputProps["aria-invalid"];

  return (
    <input
      {...inputProps}
      aria-invalid={ariaInvalid}
      className={cx(
        fieldControlBaseClass,
        inputSizeClass[controlSize],
        hasInvalidState(ariaInvalid) && fieldControlInvalidClass,
        className,
      )}
    />
  );
}

export function TextareaPrimitive({
  className,
  controlSize = "field",
  invalid,
  ...textareaProps
}: TextareaPrimitiveProps) {
  const ariaInvalid = invalid ?? textareaProps["aria-invalid"];

  return (
    <textarea
      {...textareaProps}
      aria-invalid={ariaInvalid}
      className={cx(
        fieldControlBaseClass,
        textareaSizeClass[controlSize],
        hasInvalidState(ariaInvalid) && fieldControlInvalidClass,
        className,
      )}
    />
  );
}
