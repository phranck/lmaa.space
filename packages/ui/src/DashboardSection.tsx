import { CaretDownIcon } from "@phosphor-icons/react";
import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Context for collapsible state                                     */
/* ------------------------------------------------------------------ */

interface DashboardSectionContextValue {
  collapsible: boolean;
  collapseButtonLabel: string;
  expanded: boolean;
  toggleExpanded: () => void;
}

const noop = () => {};

const DashboardSectionContext = createContext<DashboardSectionContextValue>({
  collapsible: false,
  collapseButtonLabel: "Toggle section",
  expanded: true,
  toggleExpanded: noop,
});

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface DashboardSectionProps {
  children: ReactNode;
  /** Shows a built-in collapse toggle in the section header. */
  collapsible?: boolean;
  /** Accessible label for the built-in collapse toggle. */
  collapseButtonLabel?: string;
  /** Initial expanded state for uncontrolled collapsible sections. */
  defaultExpanded?: boolean;
  /** Controlled expanded state. Body and footer are hidden when false. */
  expanded?: boolean;
  /** Called when the built-in collapse toggle changes state. */
  onExpandedChange?: (expanded: boolean) => void;
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
 * Supports controlled visibility via `expanded` and optional built-in
 * collapsible behavior via `collapsible`.
 */
export function DashboardSection({
  children,
  collapsible = false,
  collapseButtonLabel = "Toggle section",
  defaultExpanded = true,
  expanded,
  onExpandedChange,
  className = "",
}: DashboardSectionProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState<boolean | undefined>();
  const isControlled = expanded !== undefined;
  const actualExpanded = expanded ?? uncontrolledExpanded ?? defaultExpanded;
  const toggleExpanded = useCallback(() => {
    if (!collapsible) return;

    const nextExpanded = !actualExpanded;
    if (!isControlled) {
      setUncontrolledExpanded(nextExpanded);
    }
    onExpandedChange?.(nextExpanded);
  }, [actualExpanded, collapsible, isControlled, onExpandedChange]);
  const contextValue = useMemo(
    () => ({
      collapsible,
      collapseButtonLabel,
      expanded: actualExpanded,
      toggleExpanded,
    }),
    [actualExpanded, collapsible, collapseButtonLabel, toggleExpanded],
  );

  return (
    <DashboardSectionContext.Provider value={contextValue}>
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
  const { collapsible, collapseButtonLabel, expanded, toggleExpanded } =
    use(DashboardSectionContext);

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
      {(addOn || collapsible) && (
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {addOn}
          {collapsible && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={collapseButtonLabel}
              onClick={toggleExpanded}
              className="flex size-8 items-center justify-center rounded-control text-[var(--ds-text-muted)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
            >
              <CaretDownIcon
                weight="duotone"
                className={`size-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DashboardSection.Body                                             */
/* ------------------------------------------------------------------ */

function DashboardSectionBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { expanded } = use(DashboardSectionContext);

  if (!expanded) return null;

  return <div className={`flex flex-col gap-3 p-3 ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  DashboardSection.Footer                                           */
/* ------------------------------------------------------------------ */

function DashboardSectionFooter({ children, className = "" }: DashboardSectionFooterProps) {
  const { expanded } = use(DashboardSectionContext);

  if (!expanded) return null;

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
  const itemClassName = `flex w-full items-center gap-3 py-2 px-3 rounded-control text-left text-sm font-medium ${
    active
      ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
      : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
  } ${onClick ? "appearance-none border-0 bg-transparent cursor-pointer" : ""} ${className}`;
  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={itemClassName} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={itemClassName}>{content}</div>;
}

/* ------------------------------------------------------------------ */
/*  Sub-component assignment                                          */
/* ------------------------------------------------------------------ */

DashboardSection.Header = DashboardSectionHeader;
DashboardSection.Body = DashboardSectionBody;
DashboardSection.Footer = DashboardSectionFooter;
DashboardSection.Item = DashboardSectionItem;
