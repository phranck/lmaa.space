import {
  LuLayoutDashboard,
  LuInbox,
  LuStore,
  LuTag,
  LuUsers,
} from "react-icons/lu";
import { SidebarHeader } from "@/components/layout/SidebarHeader.tsx";
import { SidebarItem } from "@/components/layout/SidebarItem.tsx";
import { SidebarFooter } from "@/components/layout/SidebarFooter.tsx";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/",            label: "Übersicht",  icon: <LuLayoutDashboard size={16} /> },
  { to: "/vorschlaege", label: "Vorschläge", icon: <LuInbox           size={16} /> },
  { to: "/shops",       label: "Shops",      icon: <LuStore           size={16} /> },
  { to: "/kategorien",  label: "Kategorien", icon: <LuTag             size={16} /> },
  { to: "/benutzer",    label: "Benutzer",   icon: <LuUsers           size={16} />, ownerOnly: true },
];

interface SidebarProps {
  username?: string;
  email?: string;
  isOwner?: boolean;
  onLogout: () => void;
  onItemClick?: () => void;
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
      </nav>

      <SidebarFooter username={username} email={email} onLogout={onLogout} />
    </>
  );
}
