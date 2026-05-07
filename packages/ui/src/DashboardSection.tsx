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
  subtitle?: string;
  /** Optional right-aligned content (e.g. a toggle switch). */
  addOn?: ReactNode;
  className?: string;
}

export interface DashboardSectionFooterProps {
  children: ReactNode;
  className?: string;
}

export interface DashboardSectionItemProps {
  icon: ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  addOn?: ReactNode;
  className?: string;
  onClick?: () => void;
}

/* ------------------------------------------------------------------ */
/*  DashboardSection (root container)                                 */
/* ------------------------------------------------------------------ */

/**
 * Card-like container for grouping dashboard sections.
 * Supports collapsible mode via the `expanded` prop.
 */
export function DashboardSection({
  children,
  expanded = true,
  className = "",
}: DashboardSectionProps) {
  return (
    <DashboardSectionContext.Provider value={{ expanded }}>
      <div className={`bg-[var(--ds-section-body-bg)] rounded-xl shadow-sm ${className}`}>
        {children}
      </div>
    </DashboardSectionContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  DashboardSection.Header                                           */
/* ------------------------------------------------------------------ */

function DashboardSectionHeader({
  icon,
  title,
  subtitle,
  addOn,
  className = "",
}: DashboardSectionHeaderProps) {
  const { expanded } = useContext(DashboardSectionContext);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-1.5 bg-[var(--ds-section-header-bg)] transition-[border-radius] duration-200 ${
        expanded ? "rounded-t-xl" : "rounded-xl"
      } ${className}`}
    >
      <span className="shrink-0 text-[var(--ds-text-muted)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-medium font-serif text-[var(--ds-text)]">{title}</span>
        {subtitle && (
          <span className="block truncate text-xs font-sans text-[var(--ds-text-muted)]">
            {subtitle}
          </span>
        )}
      </span>
      {addOn && <span className="ml-auto flex shrink-0 items-center">{addOn}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DashboardSection.Body (animated collapsible via grid-rows trick)  */
/* ------------------------------------------------------------------ */

function DashboardSectionBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { expanded } = useContext(DashboardSectionContext);

  if (!expanded) return null;

  return <div className={`flex flex-col gap-3 p-3 ${className}`}>{children}</div>;
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
/*  DashboardSection.Item                                             */
/* ------------------------------------------------------------------ */

function DashboardSectionItem({
  icon,
  label,
  badge,
  active,
  addOn,
  className = "",
  onClick,
}: DashboardSectionItemProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex items-center gap-3 py-2 px-3 rounded-control text-sm font-medium ${
        active
          ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
          : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
      } ${className}`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <>
          <span className="ml-auto h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full text-xs font-medium bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] shrink-0">
            {badge}
          </span>
          <span className="w-3.5 shrink-0" />
        </>
      )}
      {addOn}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-component assignment                                          */
/* ------------------------------------------------------------------ */

DashboardSection.Header = DashboardSectionHeader;
DashboardSection.Body = DashboardSectionBody;
DashboardSection.Footer = DashboardSectionFooter;
DashboardSection.Item = DashboardSectionItem;
