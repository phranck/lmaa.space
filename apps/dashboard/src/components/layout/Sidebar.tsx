import { SidebarFooter } from "@/components/layout/SidebarFooter.tsx";
import { SidebarHeader } from "@/components/layout/SidebarHeader.tsx";
import { SidebarItem } from "@/components/layout/SidebarItem.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import {
  useCreateEmailTemplate,
  useEmailTemplates,
} from "@/features/email-templates/hooks/useEmailTemplates.ts";
import { useFormConfigs } from "@/features/form-builder/hooks/useFormConfig.ts";
import type { AdminRole } from "@lmaa/shared";
import { useState } from "react";
import { NavLink, useMatch, useNavigate } from "react-router";
import {
  SFBookPagesFill,
  SFCheckmarkCircleFill,
  SFChevronDown,
  SFCircle,
  SFDocumentFill,
  SFDocumentOnDocumentFill,
  SFEnvelopeBadgeFill,
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
              {form.slug && <span className="truncate text-xs opacity-50">/{form.slug}</span>}
            </span>
          </NavLink>
        ))}
      </div>
    </details>
  );
}

function EmailTemplatesGroup({ onItemClick }: { onItemClick?: () => void }) {
  const { messages } = useI18n();
  const sidebarMessages = messages.layout.sidebar;
  const isGroupActive = !!useMatch("/email-templates/*");
  const { data: templates } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const navigate = useNavigate();
  const [localOpen, setLocalOpen] = useState(
    () => localStorage.getItem("sidebar-email-templates-open") === "true",
  );
  const isOpen = isGroupActive || localOpen;

  return (
    <details
      open={isOpen}
      className="group"
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setLocalOpen(next);
        localStorage.setItem("sidebar-email-templates-open", String(next));
      }}
    >
      <summary className="flex items-center gap-3 px-3 py-2 rounded-control text-sm font-medium cursor-pointer list-none select-none text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]">
        <span className="shrink-0 opacity-70">
          <SFEnvelopeBadgeFill className="w-4 h-4" />
        </span>
        <span className="flex-1">{sidebarMessages.emailTemplates}</span>
        <SFChevronDown className="w-3.5 h-3.5 opacity-50 group-open:rotate-180" />
      </summary>
      <div className="mt-0.5 ml-3 pl-3 border-l border-[var(--ds-border)] space-y-0.5">
        <NavLink
          to="/email-templates"
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
          {sidebarMessages.emailTemplatesOverview}
        </NavLink>
        {(templates ?? []).map((tpl) => (
          <div key={tpl.id} className="group/item flex items-center">
            <NavLink
              to={`/email-templates/${tpl.id}`}
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex-1 flex items-center gap-2 px-3 py-1.5 rounded-control text-sm font-medium min-w-0 ${
                  isActive
                    ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                    : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
                }`
              }
            >
              <SFEnvelopeBadgeFill className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="truncate">{tpl.name}</span>
            </NavLink>
            <button
              type="button"
              title="Duplizieren"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const { id: _id, createdAt: _c, updatedAt: _u, isSystemTemplate: _s, ...fields } =
                    tpl;
                  const created = await createTemplate.mutateAsync({
                    name: `${tpl.name} (Kopie)`,
                    subject: fields.subject,
                    bodyText: fields.bodyText,
                    headerBannerUrl: fields.headerBannerUrl ?? undefined,
                    headerText: fields.headerText ?? undefined,
                    footerBannerUrl: fields.footerBannerUrl ?? undefined,
                    footerText: fields.footerText ?? undefined,
                  });
                  void navigate(`/email-templates/${created.id}`);
                } catch (err) {
                  console.error("[duplicate template]", err);
                }
              }}
              className="opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto shrink-0 p-1 mr-1 rounded text-[var(--ds-nav-text)] hover:text-[var(--ds-nav-hover-text)] hover:bg-[var(--ds-nav-hover-bg)]"
            >
              <SFDocumentOnDocumentFill className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}

function SidebarSection({ label }: { label: string }) {
  return (
    <p className="-mx-3 px-3 py-1.5 mt-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--ds-text-muted)] bg-[var(--ds-surface-hover)] select-none">
      {label}
    </p>
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
  const s = messages.layout.sidebar;
  const isAdmin = role !== undefined && ROLE_RANK[role] >= ROLE_RANK.admin;

  return (
    <>
      <SidebarHeader />

      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {/* Allgemein */}
        <SidebarSection label={s.sectionGeneral} />
        <div className="space-y-0.5">
          <SidebarItem to="/" label={s.overview} icon={<SFSquareGrid2x2Fill className="w-4 h-4" />} end onClick={onItemClick} />
          <SidebarItem to="/meldungen" label={s.submissions} icon={<SFTrayFill className="w-4 h-4" />} onClick={onItemClick} />
        </div>

        {/* Content */}
        <SidebarSection label={s.sectionContent} />
        <div className="space-y-0.5">
          <SidebarItem to="/shops" label={s.shops} icon={<SFStorefrontFill className="w-4 h-4" />} onClick={onItemClick} />
          <SidebarItem to="/kategorien" label={s.categories} icon={<SFTagFill className="w-4 h-4" />} onClick={onItemClick} />
          {isAdmin && <PagesGroup onItemClick={onItemClick} />}
        </div>

        {/* Templates */}
        {isAdmin && (
          <>
            <SidebarSection label={s.sectionTemplates} />
            <div className="space-y-0.5">
              <FormsGroup onItemClick={onItemClick} />
              <EmailTemplatesGroup onItemClick={onItemClick} />
            </div>
          </>
        )}

        {/* System */}
        {isAdmin && (
          <>
            <SidebarSection label={s.sectionSystem} />
            <div className="space-y-0.5">
              <SidebarItem to="/benutzer" label={s.users} icon={<SFPerson3Fill className="w-4 h-4" />} onClick={onItemClick} />
              <SidebarItem to="/seiten/navigationen" label={s.navigations} icon={<SFLink className="w-4 h-4" />} onClick={onItemClick} />
            </div>
          </>
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
