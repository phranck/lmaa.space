import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

import { cx } from "./classNames.ts";
import {
  fieldControlBaseClass,
  fieldErrorClass,
  fieldHelpClass,
  fieldLabelClass,
  fieldOptionalClass,
  inputSizeClass,
  textareaSizeClass,
} from "./FieldPrimitives.tsx";

export const formLabelClass = cx(fieldLabelClass, "mb-1");
export const formOptionalClass = fieldOptionalClass;
export const formInputClass = cx(fieldControlBaseClass, inputSizeClass.field);
export const formTextareaClass = cx(fieldControlBaseClass, textareaSizeClass.field);
export const formHelpClass = fieldHelpClass;
export const formBtnBaseClass =
  "inline-flex h-[var(--ds-control-h-action)] items-center gap-1.5 px-3 rounded-control text-xs font-medium transition-colors disabled:opacity-40";
export const formErrorClass = cx(fieldErrorClass, "mt-1");

export function FormLabel({ className, htmlFor, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label htmlFor={htmlFor} className={cx(formLabelClass, className)} {...props} />;
}

export function FormLabelText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx(formLabelClass, className)} {...props} />;
}

export function FormOptional({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx(formOptionalClass, className)}>{children}</span>;
}

export function FormHelpText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx(formHelpClass, className)} {...props} />;
}

export function FormErrorText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx(formErrorClass, className)} {...props} />;
}
