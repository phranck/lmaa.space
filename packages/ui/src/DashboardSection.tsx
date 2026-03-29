import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Context for collapsible state                                     */
/* ------------------------------------------------------------------ */

interface DashboardSectionContextValue {
  expanded: boolean;
}

const DashboardSectionContext = createContext<DashboardSectionContextValue>({ expanded: true });

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface DashboardSectionProps {
  children: ReactNode;
  /** When set, the section becomes collapsible. Body is hidden when false. */
  expanded?: boolean;
  className?: string;
}

export interface DashboardSectionHeaderProps {
  icon: ReactNode;
  title: string;
  /** Optional right-aligned content (e.g. a toggle switch). */
  addOn?: ReactNode;
  className?: string;
}

export interface DashboardSectionFooterProps {
  children: ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  DashboardSection (root container)                                 */
/* ------------------------------------------------------------------ */

/**
 * Card-like container for grouping dashboard sections.
 * Supports collapsible mode via the `expanded` prop.
 */
export function DashboardSection({ children, expanded = true, className = "" }: DashboardSectionProps) {
  return (
    <DashboardSectionContext.Provider value={{ expanded }}>
      <div
        className={`bg-[var(--ds-section-body-bg)] rounded-xl shadow-sm ${className}`}
      >
        {children}
      </div>
    </DashboardSectionContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  DashboardSection.Header                                           */
/* ------------------------------------------------------------------ */

function DashboardSectionHeader({ icon, title, addOn, className = "" }: DashboardSectionHeaderProps) {
  const { expanded } = useContext(DashboardSectionContext);

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
/*  DashboardSection.Body (animated collapsible via grid-rows trick)  */
/* ------------------------------------------------------------------ */

function DashboardSectionBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { expanded } = useContext(DashboardSectionContext);

  if (!expanded) return null;

  return (
    <div className={`flex flex-col gap-3 p-3 ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DashboardSection.Footer                                           */
/* ------------------------------------------------------------------ */

function DashboardSectionFooter({ children, className = "" }: DashboardSectionFooterProps) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 bg-[var(--ds-section-header-bg)] rounded-b-xl ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-component assignment                                          */
/* ------------------------------------------------------------------ */

DashboardSection.Header = DashboardSectionHeader;
DashboardSection.Body = DashboardSectionBody;
DashboardSection.Footer = DashboardSectionFooter;
