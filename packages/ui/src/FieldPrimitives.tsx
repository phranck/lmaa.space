import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import { cx } from "./classNames.ts";
import {
  fieldControlBaseClass,
  fieldControlInvalidClass,
  fieldErrorClass,
  fieldHelpClass,
  fieldLabelClass,
  fieldOptionalClass,
  fieldShellClass,
  inputSizeClass,
  textareaSizeClass,
} from "./FieldPrimitiveStyles.ts";

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
  fullWidth?: boolean;
  invalid?: boolean;
}

export interface TextareaPrimitiveProps extends ComponentPropsWithoutRef<"textarea"> {
  controlSize?: FieldControlSize;
  fullWidth?: boolean;
  invalid?: boolean;
}

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
  fullWidth,
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
        shouldFillControl(fullWidth, className) && "w-full",
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
  fullWidth,
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
        shouldFillControl(fullWidth, className) && "w-full",
        textareaSizeClass[controlSize],
        hasInvalidState(ariaInvalid) && fieldControlInvalidClass,
        className,
      )}
    />
  );
}

function shouldFillControl(fullWidth: boolean | undefined, className: string | undefined) {
  return fullWidth ?? !hasExplicitWidthClass(className);
}

function hasExplicitWidthClass(className: string | undefined) {
  return /(?:^|\s)w-(?!full(?:\s|$))[^\s]+/.test(className ?? "");
}
