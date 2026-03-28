import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Context for collapsible state                                     */
/* ------------------------------------------------------------------ */

interface FormSectionContextValue {
  expanded: boolean;
}

const FormSectionContext = createContext<FormSectionContextValue>({ expanded: true });

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface FormSectionProps {
  children: ReactNode;
  /** When set, the section becomes collapsible. Body is hidden when false. */
  expanded?: boolean;
  className?: string;
}

export interface FormSectionHeaderProps {
  icon: ReactNode;
  title: string;
  /** Optional right-aligned content (e.g. a toggle switch). */
  addOn?: ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  FormSection (root container)                                      */
/* ------------------------------------------------------------------ */

/**
 * Card-like container for grouping form sections.
 * Supports collapsible mode via the `expanded` prop.
 */
export function FormSection({ children, expanded = true, className = "" }: FormSectionProps) {
  return (
    <FormSectionContext.Provider value={{ expanded }}>
      <div
        className={`bg-[var(--ds-section-body-bg)] rounded-xl ${className}`}
      >
        {children}
      </div>
    </FormSectionContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  FormSection.Header                                                */
/* ------------------------------------------------------------------ */

function FormSectionHeader({ icon, title, addOn, className = "" }: FormSectionHeaderProps) {
  const { expanded } = useContext(FormSectionContext);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 bg-[var(--ds-section-header-bg)] transition-[border-radius] duration-200 ${
        expanded ? "rounded-t-xl" : "rounded-xl"
      } ${className}`}
    >
      <span className="shrink-0 text-[var(--ds-text-muted)]">{icon}</span>
      <span className="text-sm font-medium text-[var(--ds-text)]">{title}</span>
      {addOn && <span className="ml-auto flex items-center">{addOn}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FormSection.Body (animated collapsible via grid-rows trick)       */
/* ------------------------------------------------------------------ */

function FormSectionBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { expanded } = useContext(FormSectionContext);

  return (
    <div
      className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
      style={{
        maxHeight: expanded ? "150rem" : "0",
        opacity: expanded ? 1 : 0,
      }}
    >
      <div className={`flex flex-col gap-3 p-4 ${className}`}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-component assignment                                          */
/* ------------------------------------------------------------------ */

FormSection.Header = FormSectionHeader;
FormSection.Body = FormSectionBody;
