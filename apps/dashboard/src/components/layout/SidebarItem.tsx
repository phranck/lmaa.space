import { NavLink } from "react-router";

interface SidebarItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  onClick?: () => void;
}

function linkClass(isActive: boolean) {
  return `flex items-center gap-3 px-3 py-2 rounded-control text-sm font-medium transition-colors border-l-2 ${
    isActive
      ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)] border-[var(--ds-nav-active-border)]"
      : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)] border-transparent"
  }`;
}

export function SidebarItem({ to, label, icon, end, onClick }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => linkClass(isActive)}
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      {label}
    </NavLink>
  );
}
