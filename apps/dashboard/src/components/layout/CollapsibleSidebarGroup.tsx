import { useState } from "react";
import { useMatch } from "react-router";
import { SFChevronDown } from "sf-symbols-lib/monochrome";

function SidebarBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full text-[11px] font-medium bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] shrink-0">
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
}

export function CollapsibleSidebarGroup({
  routeMatch,
  storageKey,
  icon,
  label,
  badge,
  children,
}: CollapsibleSidebarGroupProps) {
  const isGroupActive = !!useMatch(routeMatch);
  const [localOpen, setLocalOpen] = useState(() => localStorage.getItem(storageKey) === "true");
  const isOpen = isGroupActive || localOpen;

  return (
    <details
      open={isOpen}
      className="group"
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setLocalOpen(next);
        localStorage.setItem(storageKey, String(next));
      }}
    >
      <summary className="flex items-center gap-3 px-3 py-2 rounded-control text-sm font-medium cursor-pointer list-none select-none text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]">
        <span className="shrink-0 opacity-70">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge !== undefined && <SidebarBadge count={badge} />}
        <SFChevronDown className="w-3.5 h-3.5 opacity-50 group-open:rotate-180" />
      </summary>
      <div className="mt-0.5 ml-3 pl-3 border-l border-[var(--ds-border)] space-y-0.5">
        {children}
      </div>
    </details>
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
