import { NavLink, useNavigate } from "react-router";
import SFBookPagesFill from "sf-symbols-lib/monochrome/SFBookPagesFill";
import SFChartBarFill from "sf-symbols-lib/monochrome/SFChartBarFill";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFCircle from "sf-symbols-lib/monochrome/SFCircle";
import SFDocumentFill from "sf-symbols-lib/monochrome/SFDocumentFill";
import SFDocumentOnDocumentFill from "sf-symbols-lib/monochrome/SFDocumentOnDocumentFill";
import SFEnvelopeBadgeFill from "sf-symbols-lib/monochrome/SFEnvelopeBadgeFill";
import SFEyeSlashFill from "sf-symbols-lib/monochrome/SFEyeSlashFill";
import SFLink from "sf-symbols-lib/monochrome/SFLink";
import SFListBulletRectanglePortraitFill from "sf-symbols-lib/monochrome/SFListBulletRectanglePortraitFill";
import SFPerson3Fill from "sf-symbols-lib/monochrome/SFPerson3Fill";
import SFPhotoOnRectangleAngledFill from "sf-symbols-lib/monochrome/SFPhotoOnRectangleAngledFill";
import SFRectangleBottomhalfFilled from "sf-symbols-lib/monochrome/SFRectangleBottomhalfFilled";
import SFSquareGrid2x2Fill from "sf-symbols-lib/monochrome/SFSquareGrid2x2Fill";
import SFStorefrontFill from "sf-symbols-lib/monochrome/SFStorefrontFill";
import SFTagFill from "sf-symbols-lib/monochrome/SFTagFill";
import SFTrayFill from "sf-symbols-lib/monochrome/SFTrayFill";

import type { AdminRole } from "@lmaa/shared";

import {
  CollapsibleSidebarGroup,
  sidebarGroupItemClass,
} from "@/components/layout/CollapsibleSidebarGroup.tsx";
import { SidebarFooter } from "@/components/layout/SidebarFooter.tsx";
import { SidebarHeader } from "@/components/layout/SidebarHeader.tsx";
import { SidebarItem } from "@/components/layout/SidebarItem.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import { useAdminShops } from "@/features/content/hooks/useAdminShops.ts";
import { useDeadLinkReports } from "@/features/overview/hooks/useDeadLinks.ts";
import { useShopConcernReports } from "@/features/overview/hooks/useShopConcerns.ts";
import { useAdminSubmissions } from "@/features/overview/hooks/useSubmissions.ts";
import { useAdminMedia } from "@/features/system/hooks/useAdminMedia.ts";
import { useAdminUsers } from "@/features/system/hooks/useAdminUsers.ts";
import {
  useCreateEmailTemplate,
  useEmailTemplates,
} from "@/features/templates/hooks/useEmailTemplates.ts";
import { useFormConfigs } from "@/features/templates/hooks/useFormConfig.ts";

const ROLE_RANK: Record<AdminRole, number> = { owner: 2, admin: 1, moderator: 0 };

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
  const s = messages.layout.sidebar;
  const { data: pages } = useContentPages();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/pages/*"
      storageKey="sidebar-pages-open"
      icon={<SFDocumentOnDocumentFill className="w-4 h-4" />}
      label={s.pages}
      badge={pages?.length ?? 0}
    >
      <NavLink to="/pages" end onClick={onItemClick} className={sidebarGroupItemClass}>
        {s.pagesOverview}
      </NavLink>
      {(pages ?? []).map((page) => (
        <NavLink
          key={page.slug}
          to={`/pages/${page.slug}`}
          onClick={onItemClick}
          className={sidebarGroupItemClass}
        >
          <SFDocumentFill className="w-3.5 h-3.5 shrink-0 opacity-60" />
          <StatusIcon status={page.status} />
          <span className="flex flex-col min-w-0">
            <span className="truncate">{page.title}</span>
            <span className="truncate text-xs opacity-50">/{page.slug}</span>
          </span>
        </NavLink>
      ))}
    </CollapsibleSidebarGroup>
  );
}

function FormsGroup({ onItemClick }: { onItemClick?: () => void }) {
  const { messages } = useI18n();
  const s = messages.layout.sidebar;
  const { data: forms } = useFormConfigs();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/forms/*"
      storageKey="sidebar-forms-open"
      icon={<SFBookPagesFill className="w-4 h-4" />}
      label={s.formBuilder}
      badge={forms?.length ?? 0}
    >
      <NavLink to="/forms" end onClick={onItemClick} className={sidebarGroupItemClass}>
        {s.formsOverview}
      </NavLink>
      {(forms ?? []).map((form) => (
        <NavLink
          key={form.name}
          to={`/forms/${form.name}`}
          onClick={onItemClick}
          className={sidebarGroupItemClass}
        >
          <SFListBulletRectanglePortraitFill className="w-3.5 h-3.5 shrink-0 opacity-60" />
          <span className="flex flex-col min-w-0">
            <span className="truncate">{form.name}</span>
            {form.slug && <span className="truncate text-xs opacity-50">/{form.slug}</span>}
          </span>
        </NavLink>
      ))}
    </CollapsibleSidebarGroup>
  );
}

function EmailTemplatesGroup({ onItemClick }: { onItemClick?: () => void }) {
  const { messages } = useI18n();
  const common = messages.common;
  const s = messages.layout.sidebar;
  const { data: templates } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const navigate = useNavigate();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/email-templates/*"
      storageKey="sidebar-email-templates-open"
      icon={<SFEnvelopeBadgeFill className="w-4 h-4" />}
      label={s.emailTemplates}
      badge={templates?.length ?? 0}
    >
      <NavLink to="/email-templates" end onClick={onItemClick} className={sidebarGroupItemClass}>
        {s.emailTemplatesOverview}
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
            title={common.duplicate}
            onClick={async (e) => {
              e.preventDefault();
              try {
                const {
                  id: _id,
                  createdAt: _c,
                  updatedAt: _u,
                  isSystemTemplate: _s,
                  ...fields
                } = tpl;
                const created = await createTemplate.mutateAsync({
                  name: `${tpl.name} (Copy)`,
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
    </CollapsibleSidebarGroup>
  );
}

function SidebarSection({ label }: { label: string }) {
  return <p className="section-header -mx-3 px-3 mt-3 first:mt-0">{label}</p>;
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

  const { data: shops = [] } = useAdminShops();
  const { data: categories = [] } = useAdminCategories();
  const { data: users = [] } = useAdminUsers();
  const { data: media = [] } = useAdminMedia();
  const { data: pendingSubmissions = [] } = useAdminSubmissions("pending");
  const { data: deadLinks = [] } = useDeadLinkReports();
  const { data: shopConcerns = [] } = useShopConcernReports();
  const submissionsCount = pendingSubmissions.length + deadLinks.length + shopConcerns.length;

  return (
    <>
      <SidebarHeader />

      <nav className="flex-1 overflow-y-auto px-3">
        {/* Allgemein */}
        <SidebarSection label={s.sectionGeneral} />
        <div className="space-y-0.5">
          <SidebarItem
            to="/"
            label={s.overview}
            icon={<SFSquareGrid2x2Fill className="w-4 h-4" />}
            end
            onClick={onItemClick}
          />
          <SidebarItem
            to="/reports"
            label={s.submissions}
            icon={<SFTrayFill className="w-4 h-4" />}
            badge={submissionsCount}
            onClick={onItemClick}
          />
        </div>

        {/* Content */}
        <SidebarSection label={s.sectionContent} />
        <div className="space-y-0.5">
          <SidebarItem
            to="/shops"
            label={s.shops}
            icon={<SFStorefrontFill className="w-4 h-4" />}
            badge={shops.length}
            onClick={onItemClick}
          />
          <SidebarItem
            to="/categories"
            label={s.categories}
            icon={<SFTagFill className="w-4 h-4" />}
            badge={categories.length}
            onClick={onItemClick}
          />
          {isAdmin && <PagesGroup onItemClick={onItemClick} />}
        </div>

        {/* Builders */}
        {isAdmin && (
          <>
            <SidebarSection label={s.sectionTemplates} />
            <div className="space-y-0.5">
              <FormsGroup onItemClick={onItemClick} />
              <EmailTemplatesGroup onItemClick={onItemClick} />
              <SidebarItem
                to="/footer-builder"
                label={s.footerBuilder}
                icon={<SFRectangleBottomhalfFilled className="w-4 h-4" />}
                onClick={onItemClick}
              />
            </div>
          </>
        )}

        {/* Analytics */}
        {isAdmin && (
          <>
            <SidebarSection label={s.sectionAnalytics} />
            <div className="space-y-0.5">
              <SidebarItem
                to="/analytics"
                label={s.analytics}
                icon={<SFChartBarFill className="w-4 h-4" />}
                onClick={onItemClick}
              />
            </div>
          </>
        )}

        {/* System */}
        {isAdmin && (
          <>
            <SidebarSection label={s.sectionSystem} />
            <div className="space-y-0.5">
              <SidebarItem
                to="/users"
                label={s.users}
                icon={<SFPerson3Fill className="w-4 h-4" />}
                badge={users.length}
                onClick={onItemClick}
              />
              <SidebarItem
                to="/media"
                label={s.media}
                icon={<SFPhotoOnRectangleAngledFill className="w-4 h-4" />}
                badge={media.length}
                onClick={onItemClick}
              />
              <SidebarItem
                to="/pages/navigations"
                label={s.navigations}
                icon={<SFLink className="w-4 h-4" />}
                onClick={onItemClick}
              />
              <SidebarItem
                to="/markdown-widgets"
                label={s.markdownWidgets}
                icon={<SFDocumentOnDocumentFill className="w-4 h-4" />}
                onClick={onItemClick}
              />
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
