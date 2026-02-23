import { SidebarFooter } from "@/components/layout/SidebarFooter.tsx";
import { SidebarHeader } from "@/components/layout/SidebarHeader.tsx";
import { SidebarItem } from "@/components/layout/SidebarItem.tsx";
import {
  LuChevronDown,
  LuFileText,
  LuInbox,
  LuLayoutDashboard,
  LuStore,
  LuTag,
  LuUsers,
} from "react-icons/lu";
import { NavLink, useMatch } from "react-router";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  children: { label: string; to: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Übersicht", icon: <LuLayoutDashboard size={16} /> },
  { to: "/meldungen", label: "Meldungen", icon: <LuInbox size={16} /> },
  { to: "/shops", label: "Shops", icon: <LuStore size={16} /> },
  { to: "/kategorien", label: "Kategorien", icon: <LuTag size={16} /> },
  { to: "/benutzer", label: "Benutzer", icon: <LuUsers size={16} />, ownerOnly: true },
];

const CONTENT_GROUP: NavGroup = {
  label: "Content",
  icon: <LuFileText size={16} />,
  children: [
    { label: "Über uns", to: "/content/about" },
    { label: "Impressum", to: "/content/impressum" },
    { label: "Datenschutz", to: "/content/datenschutz" },
    { label: "Aufnahmekriterien", to: "/content/aufnahmekriterien" },
  ],
};

interface SidebarProps {
  username?: string;
  email?: string;
  isOwner?: boolean;
  onLogout: () => void;
  onItemClick?: () => void;
}

function ContentGroup({ group, onItemClick }: { group: NavGroup; onItemClick?: () => void }) {
  const isGroupActive = !!useMatch("/content/*");

  return (
    <details open={isGroupActive} className="group/details">
      <summary className="flex items-center gap-3 px-3 py-2 rounded-control text-sm font-medium transition-colors border-l-2 cursor-pointer list-none select-none text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)] border-transparent">
        <span className="shrink-0 opacity-70">{group.icon}</span>
        <span className="flex-1">{group.label}</span>
        <LuChevronDown
          size={14}
          className="opacity-50 transition-transform group-open/details:rotate-180"
        />
      </summary>
      <div className="mt-0.5 ml-3 pl-3 border-l border-[var(--ds-border)] space-y-0.5">
        {group.children.map((child) => (
          <NavLink
            key={child.to}
            to={child.to}
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-1.5 rounded-control text-xs font-medium transition-colors border-l-2 ${
                isActive
                  ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)] border-[var(--ds-nav-active-border)]"
                  : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)] border-transparent"
              }`
            }
          >
            {child.label}
          </NavLink>
        ))}
      </div>
    </details>
  );
}

export function Sidebar({ username, email, isOwner, onLogout, onItemClick }: SidebarProps) {
  const navItems = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  return (
    <>
      <SidebarHeader />

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => (
          <SidebarItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            end={item.to === "/"}
            onClick={onItemClick}
          />
        ))}
        <ContentGroup group={CONTENT_GROUP} onItemClick={onItemClick} />
      </nav>

      <SidebarFooter username={username} email={email} onLogout={onLogout} />
    </>
  );
}
