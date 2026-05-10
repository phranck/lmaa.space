import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const formLabelClass = "block px-[5px] text-xs font-medium text-[var(--ds-text-subtle)] mb-1";
export const formOptionalClass = "text-[var(--ds-text-subtle)] font-normal";
export const formInputClass =
  "w-full h-[var(--ds-control-h-field)] box-border px-3 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-focus)] focus:ring-2 focus:ring-[var(--ds-focus-ring)]";
export const formTextareaClass =
  "w-full min-h-[calc(var(--ds-control-h-field)*3)] px-3 py-1.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-focus)] focus:ring-2 focus:ring-[var(--ds-focus-ring)]";
export const formHelpClass = "text-xs text-[var(--ds-text-subtle)]";
export const formBtnBaseClass =
  "inline-flex h-[var(--ds-control-h-action)] items-center gap-1.5 px-3 rounded-control text-xs font-medium transition-colors disabled:opacity-40";
export const formErrorClass = "text-red-500 text-xs mt-1";

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
