import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

import { cx } from "./classNames.ts";
import {
  fieldErrorClass,
  fieldHelpClass,
  fieldLabelClass,
  fieldOptionalClass,
} from "./FieldPrimitives.tsx";

export const formLabelClass = cx(fieldLabelClass, "mb-1");
export const formOptionalClass = fieldOptionalClass;
export const formHelpClass = fieldHelpClass;
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
