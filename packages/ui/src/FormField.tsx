import type { ReactNode } from "react";

import { FormErrorText, FormHelpText, FormLabel, FormOptional } from "./FormPrimitives.tsx";

export interface FormFieldProps {
  /** Label text displayed above the input. */
  label: string;
  /** Associates the label with an input via `htmlFor`. */
  htmlFor?: string;
  /** Show a red asterisk after the label. */
  required?: boolean;
  /** Show "(optional)" after the label. */
  optional?: boolean;
  /** Error message displayed below the input. */
  error?: string;
  /** Hint text displayed below the input (hidden when error is shown). */
  hint?: string;
  /** The form control (input, select, textarea, etc.). */
  children: ReactNode;
  /** Additional class names on the outer wrapper. */
  className?: string;
}

export function FormField({ label, htmlFor, required, optional, error, hint, children, className }: FormFieldProps): ReactNode {
  return (
    <div className={className}>
      <FormLabel htmlFor={htmlFor}>
        {label}
        {required && <span className="text-[var(--ds-text-danger,#ef4444)] ml-0.5">*</span>}
        {optional && !required && (
          <>
            {" "}
            <FormOptional>(optional)</FormOptional>
          </>
        )}
      </FormLabel>
      {children}
      {error ? <FormErrorText>{error}</FormErrorText> : hint ? <FormHelpText>{hint}</FormHelpText> : null}
    </div>
  );
}
