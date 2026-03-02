import { NavLink } from "react-router";

interface SidebarItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: number;
  onClick?: () => void;
}

function linkClass(isActive: boolean) {
  return `flex items-center gap-3 py-2 text-sm font-medium ${
    isActive
      ? "-mx-3 px-6 bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
      : "px-3 rounded-control text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
  }`;
}

/**
 * Navigation item used inside the sidebar menu.
 *
 * @param props - Link target, label and optional behavior flags.
 * @returns Styled `NavLink` entry.
 */
export function SidebarItem({ to, label, icon, end, badge, onClick }: SidebarItemProps) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className={({ isActive }) => linkClass(isActive)}>
      <span className="shrink-0 opacity-70">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <>
          <span className="ml-auto h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full text-[11px] font-medium bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] shrink-0">
            {badge}
          </span>
          {/* Ghost spacer — same width as chevron so badge aligns with group items */}
          <span className="w-3.5 shrink-0" />
        </>
      )}
    </NavLink>
  );
}
