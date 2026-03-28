import type { ReactNode } from "react";

export interface FormSectionProps {
  children: ReactNode;
  className?: string;
}

export interface FormSectionHeaderProps {
  icon: ReactNode;
  title: string;
  className?: string;
}

/**
 * Card-like container for grouping form sections.
 * Use `FormSection.Header` for icon + title, `FormSection.Body` for content.
 */
export function FormSection({ children, className = "" }: FormSectionProps) {
  return (
    <div className={`flex flex-col gap-3 bg-[var(--ds-section-body-bg)] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

function FormSectionHeader({ icon, title, className = "" }: FormSectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 -mx-4 -mt-4 px-4 py-2.5 rounded-t-xl bg-[var(--ds-section-header-bg)] ${className}`}>
      <span className="shrink-0 text-[var(--ds-text-muted)]">{icon}</span>
      <span className="text-sm font-medium text-[var(--ds-text)]">{title}</span>
    </div>
  );
}

function FormSectionBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>;
}

FormSection.Header = FormSectionHeader;
FormSection.Body = FormSectionBody;
