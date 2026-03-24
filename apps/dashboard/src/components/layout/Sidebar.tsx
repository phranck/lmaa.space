import {
  CaretCircleDoubleDownIcon,
  CaretCircleDoubleUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CircleIcon,
  CopyIcon,
  EnvelopeOpenIcon,
  EyeSlashIcon,
  FileIcon,
  HandshakeIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  MarkdownLogoIcon,
  NotebookIcon,
  PauseCircleIcon,
  SquareHalfBottomIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TagIcon,
  TrayIcon,
  UsersThreeIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";

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
const SIDEBAR_GROUP_STORAGE_KEYS = [
  "sidebar-reports-open",
  "sidebar-pages-open",
  "sidebar-forms-open",
  "sidebar-email-templates-open",
] as const;

function StatusIcon({ status }: { status: string }) {
  if (status === "published") {
    return <CheckCircleIcon weight="duotone" className="w-3 h-3 text-green-500 shrink-0" />;
  }
  if (status === "hidden") {
    return <EyeSlashIcon weight="duotone" className="w-3 h-3 text-gray-400 shrink-0" />;
  }
  return <CircleIcon weight="duotone" className="w-3 h-3 text-amber-500 shrink-0" />;
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

function PagesGroup({
  onItemClick,
  globalOpenState,
  globalOpenVersion,
  onOpenChange,
}: {
  onItemClick?: () => void;
  globalOpenState?: boolean | null;
  globalOpenVersion?: number;
  onOpenChange?: (open: boolean) => void;
}) {
  const { messages } = useI18n();
  const s = messages.layout.sidebar;
  const { data: pages } = useContentPages();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/pages/*"
      storageKey="sidebar-pages-open"
      icon={<CopyIcon weight="duotone" className="w-4 h-4" />}
      label={s.pages}
      badge={pages?.length ?? 0}
      globalOpenState={globalOpenState}
      globalOpenVersion={globalOpenVersion}
      onOpenChange={onOpenChange}
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
          <FileIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
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

function FormsGroup({
  onItemClick,
  globalOpenState,
  globalOpenVersion,
  onOpenChange,
}: {
  onItemClick?: () => void;
  globalOpenState?: boolean | null;
  globalOpenVersion?: number;
  onOpenChange?: (open: boolean) => void;
}) {
  const { messages } = useI18n();
  const s = messages.layout.sidebar;
  const { data: forms } = useFormConfigs();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/forms/*"
      storageKey="sidebar-forms-open"
      icon={<NotebookIcon weight="duotone" className="w-4 h-4" />}
      label={s.formBuilder}
      badge={forms?.length ?? 0}
      globalOpenState={globalOpenState}
      globalOpenVersion={globalOpenVersion}
      onOpenChange={onOpenChange}
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
          <ListBulletsIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
          <span className="flex flex-col min-w-0">
            <span className="truncate">{form.name}</span>
            {form.slug && <span className="truncate text-xs opacity-50">/{form.slug}</span>}
          </span>
        </NavLink>
      ))}
    </CollapsibleSidebarGroup>
  );
}

function EmailTemplatesGroup({
  onItemClick,
  globalOpenState,
  globalOpenVersion,
  onOpenChange,
}: {
  onItemClick?: () => void;
  globalOpenState?: boolean | null;
  globalOpenVersion?: number;
  onOpenChange?: (open: boolean) => void;
}) {
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
      icon={<EnvelopeOpenIcon weight="duotone" className="w-4 h-4" />}
      label={s.emailTemplates}
      badge={templates?.length ?? 0}
      globalOpenState={globalOpenState}
      globalOpenVersion={globalOpenVersion}
      onOpenChange={onOpenChange}
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
            <EnvelopeOpenIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
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
            <CopyIcon weight="duotone" className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </CollapsibleSidebarGroup>
  );
}

function SidebarSubItemBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full text-xs font-medium bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] shrink-0">
      {count}
    </span>
  );
}

function ReportsGroup({
  onItemClick,
  globalOpenState,
  globalOpenVersion,
  onOpenChange,
  suggestionsCount,
  pendingCount,
  deadLinksCount,
  shopReportsCount,
}: {
  onItemClick?: () => void;
  globalOpenState?: boolean | null;
  globalOpenVersion?: number;
  onOpenChange?: (open: boolean) => void;
  suggestionsCount: number;
  pendingCount: number;
  deadLinksCount: number;
  shopReportsCount: number;
}) {
  const { messages } = useI18n();
  const s = messages.layout.sidebar;
  const submissions = messages.submissions;

  return (
    <CollapsibleSidebarGroup
      routeMatch="/reports/*"
      storageKey="sidebar-reports-open"
      icon={<TrayIcon weight="duotone" className="w-4 h-4" />}
      label={s.submissions}
      badge={pendingCount + deadLinksCount + shopReportsCount}
      globalOpenState={globalOpenState}
      globalOpenVersion={globalOpenVersion}
      onOpenChange={onOpenChange}
    >
      <NavLink to="/reports/suggestions" onClick={onItemClick} className={sidebarGroupItemClass}>
        <ClockIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
        <span className="flex-1">{submissions.tabs.suggestions}</span>
        <SidebarSubItemBadge count={suggestionsCount} />
      </NavLink>
      <NavLink to="/reports/dead-links" onClick={onItemClick} className={sidebarGroupItemClass}>
        <XCircleIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
        <span className="flex-1">{submissions.tabs.deadLinks}</span>
        <SidebarSubItemBadge count={deadLinksCount} />
      </NavLink>
      <NavLink to="/reports/shop-reports" onClick={onItemClick} className={sidebarGroupItemClass}>
        <PauseCircleIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
        <span className="flex-1">{submissions.tabs.shopReports}</span>
        <SidebarSubItemBadge count={shopReportsCount} />
      </NavLink>
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
  const suggestionsCount = pendingSubmissions.length;
  const [groupOpenVersion, setGroupOpenVersion] = useState(0);
  const [groupOpenState, setGroupOpenState] = useState<boolean | null>(null);
  const [groupStatus, setGroupStatus] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      SIDEBAR_GROUP_STORAGE_KEYS.map((key) => [key, localStorage.getItem(key) === "true"]),
    ),
  );
  const areAllGroupsOpen = SIDEBAR_GROUP_STORAGE_KEYS.every((key) => groupStatus[key]);

  function handleToggleAllGroups(next: boolean) {
    SIDEBAR_GROUP_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, String(next)));
    setGroupStatus(Object.fromEntries(SIDEBAR_GROUP_STORAGE_KEYS.map((key) => [key, next])));
    setGroupOpenState(next);
    setGroupOpenVersion((version) => version + 1);
  }

  function handleGroupOpenChange(storageKey: (typeof SIDEBAR_GROUP_STORAGE_KEYS)[number], open: boolean) {
    setGroupStatus((current) => {
      if (current[storageKey] === open) return current;
      return { ...current, [storageKey]: open };
    });
  }

  return (
    <>
      <SidebarHeader />

      <nav className="flex-1 overflow-y-auto px-3">
        <div className="sticky top-0 z-10 -mx-3 px-3 pt-3 pb-2 bg-[var(--ds-surface)]">
          <button
            type="button"
            onClick={() => handleToggleAllGroups(!areAllGroupsOpen)}
            className="flex w-full items-center justify-center gap-2 h-8 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-xs font-medium text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] transition-colors"
            aria-label={areAllGroupsOpen ? s.collapseAllAria : s.expandAllAria}
            title={areAllGroupsOpen ? s.collapseAllAria : s.expandAllAria}
          >
            <span className="relative h-3.5 w-3.5 shrink-0 overflow-hidden">
              <CaretCircleDoubleDownIcon
                weight="duotone"
                className={`absolute inset-0 h-3.5 w-3.5 transition-all duration-200 ease-out ${
                  areAllGroupsOpen
                    ? "-translate-y-1 opacity-0 scale-90"
                    : "translate-y-0 opacity-100 scale-100"
                }`}
              />
              <CaretCircleDoubleUpIcon
                weight="duotone"
                className={`absolute inset-0 h-3.5 w-3.5 transition-all duration-200 ease-out ${
                  areAllGroupsOpen
                    ? "translate-y-0 opacity-100 scale-100"
                    : "translate-y-1 opacity-0 scale-90"
                }`}
              />
            </span>
            <span className="relative inline-grid overflow-hidden">
              <span
                className={`col-start-1 row-start-1 transition-all duration-200 ease-out ${
                  areAllGroupsOpen
                    ? "-translate-y-1 opacity-0"
                    : "translate-y-0 opacity-100"
                }`}
              >
                {s.expandAll}
              </span>
              <span
                className={`col-start-1 row-start-1 transition-all duration-200 ease-out ${
                  areAllGroupsOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-1 opacity-0"
                }`}
              >
                {s.collapseAll}
              </span>
            </span>
          </button>
        </div>

        {/* Allgemein */}
        <SidebarSection label={s.sectionGeneral} />
        <div className="space-y-0.5">
          <SidebarItem
            to="/"
            label={s.overview}
            icon={<SquaresFourIcon weight="duotone" className="w-4 h-4" />}
            end
            onClick={onItemClick}
          />
          <ReportsGroup
            onItemClick={onItemClick}
            globalOpenState={groupOpenState}
            globalOpenVersion={groupOpenVersion}
            onOpenChange={(open) => handleGroupOpenChange("sidebar-reports-open", open)}
            suggestionsCount={suggestionsCount}
            pendingCount={pendingSubmissions.length}
            deadLinksCount={deadLinks.length}
            shopReportsCount={shopConcerns.length}
          />
        </div>

        {/* Content */}
        <SidebarSection label={s.sectionContent} />
        <div className="space-y-0.5">
          <SidebarItem
            to="/shops"
            label={s.shops}
            icon={<StorefrontIcon weight="duotone" className="w-4 h-4" />}
            badge={shops.length}
            onClick={onItemClick}
          />
          <SidebarItem
            to="/categories"
            label={s.categories}
            icon={<TagIcon weight="duotone" className="w-4 h-4" />}
            badge={categories.length}
            onClick={onItemClick}
          />
          {isAdmin && (
            <PagesGroup
              onItemClick={onItemClick}
              globalOpenState={groupOpenState}
              globalOpenVersion={groupOpenVersion}
              onOpenChange={(open) => handleGroupOpenChange("sidebar-pages-open", open)}
            />
          )}
        </div>

        {/* Builders */}
        {isAdmin && (
          <>
            <SidebarSection label={s.sectionTemplates} />
            <div className="space-y-0.5">
              <FormsGroup
                onItemClick={onItemClick}
                globalOpenState={groupOpenState}
                globalOpenVersion={groupOpenVersion}
                onOpenChange={(open) => handleGroupOpenChange("sidebar-forms-open", open)}
              />
              <EmailTemplatesGroup
                onItemClick={onItemClick}
                globalOpenState={groupOpenState}
                globalOpenVersion={groupOpenVersion}
                onOpenChange={(open) => handleGroupOpenChange("sidebar-email-templates-open", open)}
              />
              <SidebarItem
                to="/footer-builder"
                label={s.footerBuilder}
                icon={<SquareHalfBottomIcon weight="duotone" className="w-4 h-4" />}
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
                icon={<ChartBarIcon weight="duotone" className="w-4 h-4" />}
                onClick={onItemClick}
              />
            </div>
          </>
        )}

        {/* Affiliate */}
        {isAdmin && (
          <>
            <SidebarSection label="Affiliate" />
            <div className="space-y-0.5">
              <SidebarItem
                to="/affiliate"
                label={s.affiliate ?? "Affiliate"}
                icon={<HandshakeIcon weight="duotone" className="w-4 h-4" />}
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
                icon={<UsersThreeIcon weight="duotone" className="w-4 h-4" />}
                badge={users.length}
                onClick={onItemClick}
              />
              <SidebarItem
                to="/media"
                label={s.media}
                icon={<ImageIcon weight="duotone" className="w-4 h-4" />}
                badge={media.length}
                onClick={onItemClick}
              />
              <SidebarItem
                to="/pages/navigations"
                label={s.navigations}
                icon={<LinkIcon weight="duotone" className="w-4 h-4" />}
                onClick={onItemClick}
              />
              <SidebarItem
                to="/markdown-widgets"
                label={s.markdownWidgets}
                icon={<MarkdownLogoIcon weight="duotone" className="w-4 h-4" />}
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
