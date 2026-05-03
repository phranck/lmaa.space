import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArticleIcon,
  BlueprintIcon,
  CaretCircleDoubleDownIcon,
  CaretCircleDoubleUpIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  CreditCardIcon,
  CircleIcon,
  ClockIcon,
  CopyIcon,
  DotsSixVerticalIcon,
  EnvelopeOpenIcon,
  EyeSlashIcon,
  FileIcon,
  GearIcon,
  GearSixIcon,
  HandshakeIcon,
  HouseSimpleIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  MarkdownLogoIcon,
  NotebookIcon,
  PauseCircleIcon,
  SlidersHorizontalIcon,
  SquareHalfBottomIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TagIcon,
  TrayIcon,
  UsersThreeIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router";

import type { AdminRole } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui";

import {
  CollapsibleSidebarGroup,
  sidebarGroupItemClass,
} from "@/components/layout/CollapsibleSidebarGroup.tsx";
import { SidebarFooter } from "@/components/layout/SidebarFooter.tsx";
import { SidebarHeader } from "@/components/layout/SidebarHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useActiveAffiliateScanJob } from "@/features/affiliate/hooks/useActiveAffiliateScanJob.ts";
import { useAffiliateScans } from "@/features/affiliate/hooks/useAffiliateScans.ts";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useUpdateUiPreferences } from "@/features/auth/useUpdateUiPreferences.ts";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import { useAdminShops } from "@/features/content/shops/hooks/useAdminShops.ts";
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

const SIDEBAR_SECTION_IDS = [
  "general",
  "content",
  "builders",
  "analytics",
  "affiliate",
  "system",
] as const;
type SidebarSectionId = (typeof SIDEBAR_SECTION_IDS)[number];
const ADMIN_ONLY_SECTIONS: SidebarSectionId[] = ["builders", "analytics", "affiliate", "system"];

function parseSectionOrder(dbOrder?: string[]): SidebarSectionId[] {
  if (!Array.isArray(dbOrder)) return [...SIDEBAR_SECTION_IDS];
  const valid = dbOrder.filter((id): id is SidebarSectionId =>
    (SIDEBAR_SECTION_IDS as readonly string[]).includes(id),
  );
  const missing = SIDEBAR_SECTION_IDS.filter((id) => !valid.includes(id));
  return [...valid, ...missing];
}

function SortableSidebarSection({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const dragHandle = (
    <button
      type="button"
      {...listeners}
      className="opacity-0 group-hover/section:opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-opacity duration-100"
      tabIndex={-1}
      aria-label="Abschnitt verschieben"
    >
      <DotsSixVerticalIcon weight="bold" className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`group/section mt-3 ${isDragging ? "opacity-50 z-50 relative" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children(dragHandle)}
    </div>
  );
}

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
  bare?: boolean;
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

function AffiliateSidebarGroup({
  onItemClick,
  dragHandle,
}: {
  onItemClick?: () => void;
  dragHandle?: ReactNode;
}) {
  const { messages } = useI18n();
  const s = messages.layout.sidebar;
  const { data: scans = [] } = useAffiliateScans({});
  const { data: job } = useActiveAffiliateScanJob();
  const isScanning = job?.status === "running" || job?.status === "pending";

  return (
    <DashboardSection>
      <DashboardSection.Header icon={<HandshakeIcon weight="duotone" className="w-4 h-4" />} title="Affiliate" addOn={dragHandle} />
      <DashboardSection.Body className="!gap-0.5 !p-2">
        <NavLink to="/affiliate" end onClick={onItemClick} className="contents">
          {({ isActive }) => (
            <DashboardSection.Item
              icon={<HandshakeIcon weight="duotone" className="w-4 h-4" />}
              label={s.affiliate}
              active={isActive}
              addOn={
                <>
                  {isScanning && (
                    <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shadow-[0_0_4px_rgba(248,113,113,0.8)]" />
                      Live
                    </span>
                  )}
                  {scans.length > 0 && (
                    <span className={`h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full text-xs font-medium bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] shrink-0 ${!isScanning ? "ml-auto" : ""}`}>
                      {scans.length}
                    </span>
                  )}
                  <span className="w-3.5 shrink-0" />
                </>
              }
            />
          )}
        </NavLink>
        <NavLink to="/affiliate/settings" onClick={onItemClick} className="contents">
          {({ isActive }) => (
            <DashboardSection.Item
              icon={<GearIcon weight="duotone" className="w-4 h-4" />}
              label={s.affiliateSettings}
              active={isActive}
            />
          )}
        </NavLink>
      </DashboardSection.Body>
    </DashboardSection>
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
  bare,
}: SidebarProps) {
  const { messages } = useI18n();
  const s = messages.layout.sidebar;
  const isAdmin = role !== undefined && ROLE_RANK[role] >= ROLE_RANK.admin;
  const { user } = useAuth();
  const updatePreferences = useUpdateUiPreferences();

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
  const [sectionOrder, setSectionOrder] = useState<SidebarSectionId[]>(() =>
    parseSectionOrder(user?.uiPreferences?.sidebarSectionOrder ?? undefined),
  );

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const from = sectionOrder.indexOf(active.id as SidebarSectionId);
      const to = sectionOrder.indexOf(over.id as SidebarSectionId);
      const next = arrayMove(sectionOrder, from, to);
      setSectionOrder(next);
      updatePreferences.mutate({ sidebarSectionOrder: next });
    }
  }

  return (
    <>
      {!bare && <SidebarHeader />}

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="sticky top-0 z-10 -mx-3 px-3 pt-3 pb-2 bg-[var(--ds-card-bg,var(--ds-surface))]">
          <button
            type="button"
            onClick={() => handleToggleAllGroups(!areAllGroupsOpen)}
            className="flex w-full items-center justify-center gap-2 h-8 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-xs font-medium text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]"
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

        {(() => {
          const visibleSections = sectionOrder.filter(
            (id) => !ADMIN_ONLY_SECTIONS.includes(id) || isAdmin,
          );

          const sectionContent: Record<SidebarSectionId, (dragHandle: ReactNode) => ReactNode> = {
            general: (dragHandle) => (
              <DashboardSection>
                <DashboardSection.Header
                  icon={<HouseSimpleIcon weight="duotone" className="w-4 h-4" />}
                  title={s.sectionGeneral}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <NavLink to="/" end onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<SquaresFourIcon weight="duotone" className="w-4 h-4" />}
                        label={s.overview}
                        active={isActive}
                      />
                    )}
                  </NavLink>
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
                </DashboardSection.Body>
              </DashboardSection>
            ),
            content: (dragHandle) => (
              <DashboardSection>
                <DashboardSection.Header
                  icon={<ArticleIcon weight="duotone" className="w-4 h-4" />}
                  title={s.sectionContent}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <NavLink to="/shops" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<StorefrontIcon weight="duotone" className="w-4 h-4" />}
                        label={s.shops}
                        badge={shops.length}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/categories" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<TagIcon weight="duotone" className="w-4 h-4" />}
                        label={s.categories}
                        badge={categories.length}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/landing-page" onClick={onItemClick} className="contents">
                      {({ isActive }) => (
                        <DashboardSection.Item
                          icon={<HouseSimpleIcon weight="duotone" className="w-4 h-4" />}
                          label={s.landingPage}
                          active={isActive}
                        />
                      )}
                    </NavLink>
                  )}
                  {isAdmin && (
                    <PagesGroup
                      onItemClick={onItemClick}
                      globalOpenState={groupOpenState}
                      globalOpenVersion={groupOpenVersion}
                      onOpenChange={(open) => handleGroupOpenChange("sidebar-pages-open", open)}
                    />
                  )}
                </DashboardSection.Body>
              </DashboardSection>
            ),
            builders: (dragHandle) => (
              <DashboardSection>
                <DashboardSection.Header
                  icon={<BlueprintIcon weight="duotone" className="w-4 h-4" />}
                  title={s.sectionTemplates}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
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
                    onOpenChange={(open) =>
                      handleGroupOpenChange("sidebar-email-templates-open", open)
                    }
                  />
                  <NavLink to="/footer-builder" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<SquareHalfBottomIcon weight="duotone" className="w-4 h-4" />}
                        label={s.footerBuilder}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                </DashboardSection.Body>
              </DashboardSection>
            ),
            analytics: (dragHandle) => (
              <DashboardSection>
                <DashboardSection.Header
                  icon={<ChartLineUpIcon weight="duotone" className="w-4 h-4" />}
                  title={s.sectionAnalytics}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <NavLink to="/analytics" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<ChartBarIcon weight="duotone" className="w-4 h-4" />}
                        label={s.analytics}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                </DashboardSection.Body>
              </DashboardSection>
            ),
            affiliate: (dragHandle) => (
              <AffiliateSidebarGroup onItemClick={onItemClick} dragHandle={dragHandle} />
            ),
            system: (dragHandle) => (
              <DashboardSection>
                <DashboardSection.Header
                  icon={<GearSixIcon weight="duotone" className="w-4 h-4" />}
                  title={s.sectionSystem}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <NavLink to="/users" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<UsersThreeIcon weight="duotone" className="w-4 h-4" />}
                        label={s.users}
                        badge={users.length}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/media" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<ImageIcon weight="duotone" className="w-4 h-4" />}
                        label={s.media}
                        badge={media.length}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/pages/navigations" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<LinkIcon weight="duotone" className="w-4 h-4" />}
                        label={s.navigations}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/markdown-widgets" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<MarkdownLogoIcon weight="duotone" className="w-4 h-4" />}
                        label={s.markdownWidgets}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/billing" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<CreditCardIcon weight="duotone" className="w-4 h-4" />}
                        label={s.billing}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/system/settings" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<SlidersHorizontalIcon weight="duotone" className="w-4 h-4" />}
                        label={s.systemSettings}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                </DashboardSection.Body>
              </DashboardSection>
            ),
          };

          return (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleSections} strategy={verticalListSortingStrategy}>
                {visibleSections.map((id) => (
                  <SortableSidebarSection key={id} id={id}>
                    {(dragHandle) => sectionContent[id](dragHandle)}
                  </SortableSidebarSection>
                ))}
              </SortableContext>
            </DndContext>
          );
        })()}
      </nav>

      {!bare && (
        <SidebarFooter
          username={username}
          firstName={firstName}
          lastName={lastName}
          role={role}
          avatarUrl={avatarUrl}
          onLogout={onLogout}
          onEditProfile={onEditProfile}
        />
      )}
    </>
  );
}
