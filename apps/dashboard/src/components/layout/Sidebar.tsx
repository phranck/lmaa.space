import { SidebarFooter } from "@/components/layout/SidebarFooter.tsx";
import { SidebarHeader } from "@/components/layout/SidebarHeader.tsx";
import { SidebarItem } from "@/components/layout/SidebarItem.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import { useFormConfigs } from "@/features/form-builder/hooks/useFormConfig.ts";
import type { AdminRole } from "@lmaa/shared";
import { useState } from "react";
import { NavLink, useMatch } from "react-router";
import {
  SFBookPagesFill,
  SFCheckmarkCircleFill,
  SFChevronDown,
  SFCircle,
  SFDocumentFill,
  SFDocumentOnDocumentFill,
  SFEyeSlashFill,
  SFLink,
  SFListBulletRectanglePortraitFill,
  SFPerson3Fill,
  SFSquareGrid2x2Fill,
  SFStorefrontFill,
  SFTagFill,
  SFTrayFill,
} from "sf-symbols-lib/monochrome";

const ROLE_RANK: Record<AdminRole, number> = { owner: 2, admin: 1, moderator: 0 };

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  minRole?: AdminRole;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "published") {
    return <SFCheckmarkCircleFill className="w-3 h-3 text-green-500 shrink-0" />;
  }
  if (status === "hidden") {
    return <SFEyeSlashFill className="w-3 h-3 text-gray-400 shrink-0" />;
  }
  return <SFCircle className="w-3 h-3 text-amber-500 shrink-0" />;
}

interface SidebarProps {
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role?: AdminRole;
  onLogout: () => void;
  onItemClick?: () => void;
  onEditProfile?: () => void;
}

function PagesGroup({ onItemClick }: { onItemClick?: () => void }) {
  const { messages } = useI18n();
  const sidebarMessages = messages.layout.sidebar;
  const isGroupActive = !!useMatch("/seiten/*");
  const { data: pages } = useContentPages();
  const [localOpen, setLocalOpen] = useState(
    () => localStorage.getItem("sidebar-pages-open") === "true",
  );
  const isOpen = isGroupActive || localOpen;

  return (
    <details
      open={isOpen}
      className="group"
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setLocalOpen(next);
        localStorage.setItem("sidebar-pages-open", String(next));
      }}
    >
      <summary className="flex items-center gap-3 px-3 py-2 rounded-control text-sm font-medium cursor-pointer list-none select-none text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]">
        <span className="shrink-0 opacity-70">
          <SFDocumentOnDocumentFill className="w-4 h-4" />
        </span>
        <span className="flex-1">{sidebarMessages.pages}</span>
        <SFChevronDown className="w-3.5 h-3.5 opacity-50 group-open:rotate-180" />
      </summary>
      <div className="mt-0.5 ml-3 pl-3 border-l border-[var(--ds-border)] space-y-0.5">
        <NavLink
          to="/seiten"
          end
          onClick={onItemClick}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-1.5 rounded-control text-sm font-medium ${
              isActive
                ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
            }`
          }
        >
          {sidebarMessages.pagesOverview}
        </NavLink>
        {(pages ?? []).map((page) => (
          <NavLink
            key={page.slug}
            to={`/seiten/${page.slug}`}
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-control text-sm font-medium ${
                isActive
                  ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                  : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
              }`
            }
          >
            <SFDocumentFill className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <StatusIcon status={page.status} />
            <span className="flex flex-col min-w-0">
              <span className="truncate">{page.title}</span>
              <span className="truncate text-xs opacity-50">/{page.slug}</span>
            </span>
          </NavLink>
        ))}
      </div>
    </details>
  );
}

function FormsGroup({ onItemClick }: { onItemClick?: () => void }) {
  const { messages } = useI18n();
  const sidebarMessages = messages.layout.sidebar;
  const isGroupActive = !!useMatch("/formular/*");
  const { data: forms } = useFormConfigs();
  const [localOpen, setLocalOpen] = useState(
    () => localStorage.getItem("sidebar-forms-open") === "true",
  );
  const isOpen = isGroupActive || localOpen;

  return (
    <details
      open={isOpen}
      className="group"
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setLocalOpen(next);
        localStorage.setItem("sidebar-forms-open", String(next));
      }}
    >
      <summary className="flex items-center gap-3 px-3 py-2 rounded-control text-sm font-medium cursor-pointer list-none select-none text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]">
        <span className="shrink-0 opacity-70">
          <SFBookPagesFill className="w-4 h-4" />
        </span>
        <span className="flex-1">{sidebarMessages.formBuilder}</span>
        <SFChevronDown className="w-3.5 h-3.5 opacity-50 group-open:rotate-180" />
      </summary>
      <div className="mt-0.5 ml-3 pl-3 border-l border-[var(--ds-border)] space-y-0.5">
        <NavLink
          to="/formular"
          end
          onClick={onItemClick}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-1.5 rounded-control text-sm font-medium ${
              isActive
                ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
            }`
          }
        >
          {sidebarMessages.formsOverview}
        </NavLink>
        {(forms ?? []).map((form) => (
          <NavLink
            key={form.name}
            to={`/formular/${form.name}`}
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-control text-sm font-medium ${
                isActive
                  ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                  : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
              }`
            }
          >
            <SFListBulletRectanglePortraitFill className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="flex flex-col min-w-0">
              <span className="truncate">{form.name}</span>
              {form.slug && (
                <span className="truncate text-xs opacity-50">/{form.slug}</span>
              )}
            </span>
          </NavLink>
        ))}
      </div>
    </details>
  );
}

/**
 * Collapsible dashboard sidebar including navigation and footer actions.
 *
 * @param props - Sidebar state and interaction callbacks.
 * @returns Sidebar navigation panel.
 */
export function Sidebar({
  username,
  firstName,
  lastName,
  avatarUrl,
  role,
  onLogout,
  onItemClick,
  onEditProfile,
}: SidebarProps) {
  const { messages } = useI18n();
  const sidebarMessages = messages.layout.sidebar;
  const navItems: NavItem[] = [
    { to: "/", label: sidebarMessages.overview, icon: <SFSquareGrid2x2Fill className="w-4 h-4" /> },
    {
      to: "/meldungen",
      label: sidebarMessages.submissions,
      icon: <SFTrayFill className="w-4 h-4" />,
    },
    { to: "/shops", label: sidebarMessages.shops, icon: <SFStorefrontFill className="w-4 h-4" /> },
    {
      to: "/kategorien",
      label: sidebarMessages.categories,
      icon: <SFTagFill className="w-4 h-4" />,
    },
    {
      to: "/benutzer",
      label: sidebarMessages.users,
      icon: <SFPerson3Fill className="w-4 h-4" />,
      minRole: "admin",
    },
  ];
  const visibleNavItems = navItems.filter(
    (item) => !item.minRole || (role !== undefined && ROLE_RANK[role] >= ROLE_RANK[item.minRole]),
  );
  const showPages = role !== undefined && ROLE_RANK[role] >= ROLE_RANK.admin;

  return (
    <>
      <SidebarHeader />

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleNavItems.map((item) => (
          <SidebarItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            end={item.to === "/"}
            onClick={onItemClick}
          />
        ))}
        {showPages && <PagesGroup onItemClick={onItemClick} />}
        {showPages && <FormsGroup onItemClick={onItemClick} />}
        {showPages && (
          <SidebarItem
            to="/seiten/navigationen"
            label={sidebarMessages.navigations}
            icon={<SFLink className="w-4 h-4" />}
            onClick={onItemClick}
          />
        )}
      </nav>

      <SidebarFooter
        username={username}
        firstName={firstName}
        lastName={lastName}
        role={role}
        avatarUrl={avatarUrl}
        onLogout={onLogout}
        onEditProfile={onEditProfile}
      />
    </>
  );
}
