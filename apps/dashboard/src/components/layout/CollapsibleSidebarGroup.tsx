import { useEffect, useState } from "react";
import { useMatch } from "react-router";
import { CaretDownIcon } from "@phosphor-icons/react";

function SidebarBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full text-xs font-medium bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] shrink-0">
      {count}
    </span>
  );
}

interface CollapsibleSidebarGroupProps {
  routeMatch: string;
  storageKey: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  children: React.ReactNode;
  globalOpenState?: boolean | null;
  globalOpenVersion?: number;
  onOpenChange?: (open: boolean) => void;
}

export function CollapsibleSidebarGroup({
  routeMatch,
  storageKey,
  icon,
  label,
  badge,
  children,
  globalOpenState = null,
  globalOpenVersion = 0,
  onOpenChange,
}: CollapsibleSidebarGroupProps) {
  const isGroupActive = !!useMatch(routeMatch);
  const [localOpen, setLocalOpen] = useState(() => {
    const stored = localStorage.getItem(storageKey) === "true";
    return isGroupActive || stored;
  });

  useEffect(() => {
    if (!isGroupActive) return;
    setLocalOpen(true);
  }, [isGroupActive]);

  useEffect(() => {
    if (globalOpenState === null) return;
    setLocalOpen(globalOpenState);
    localStorage.setItem(storageKey, String(globalOpenState));
  }, [globalOpenState, globalOpenVersion, storageKey]);

  useEffect(() => {
    onOpenChange?.(localOpen);
  }, [localOpen, onOpenChange]);

  function toggleOpen() {
    setLocalOpen((current) => {
      const next = !current;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  return (
    <div className="group">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={localOpen}
        className="flex w-full items-center gap-3 px-3 py-2 rounded-control text-sm font-medium text-left select-none text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)] transition-colors"
      >
        <span className="shrink-0 opacity-70">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge !== undefined && <SidebarBadge count={badge} />}
        <CaretDownIcon
          weight="duotone"
          className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ease-out ${localOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          localOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 ml-3 pl-3 border-l border-[var(--ds-border)] space-y-0.5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns className callback for NavLink items inside a CollapsibleSidebarGroup.
 */
export function sidebarGroupItemClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2 px-3 py-1.5 rounded-control text-sm font-medium ${
    isActive
      ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
      : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
  }`;
}
