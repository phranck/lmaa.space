import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
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
  BugIcon,
  CaretCircleDoubleDownIcon,
  CaretCircleDoubleUpIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  CopyIcon,
  EnvelopeOpenIcon,
  EyeSlashIcon,
  FileIcon,
  FileTextIcon,
  GearSixIcon,
  HouseSimpleIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  MarkdownLogoIcon,
  NotebookIcon,
  PaperPlaneTiltIcon,
  PauseCircleIcon,
  RobotIcon,
  SlidersHorizontalIcon,
  ShareNetworkIcon,
  SquareHalfBottomIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TagIcon,
  TrashIcon,
  TrayIcon,
  UsersThreeIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router";

import type { AdminRole } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { CollapsibleSidebarGroup } from "@/components/layout/CollapsibleSidebarGroup.tsx";
import { sidebarGroupItemClass } from "@/components/layout/sidebar-group-styles.ts";
import { SidebarFooter } from "@/components/layout/SidebarFooter.tsx";
import { SidebarHeader } from "@/components/layout/SidebarHeader.tsx";
import { DashboardDragHandle } from "@/components/ui/DashboardControls.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { SubMenu } from "@/components/ui/SubMenu.tsx";
import { useDashboardSortableSensors } from "@/components/ui/useDashboardSortableSensors.ts";
import { useI18n } from "@/context/I18nContext.tsx";
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
import { useSocialPreviewProjects } from "@/features/system/hooks/useSocialPreviewImages.ts";
import {
  useCreateEmailTemplate,
  useEmailTemplates,
} from "@/features/templates/hooks/useEmailTemplates.ts";
import { useFormConfigs } from "@/features/templates/hooks/useFormConfig.ts";
import {
  useCreateSocialMediaPostTemplate,
  useDeleteSocialMediaPostTemplate,
  useSocialMediaPostTemplates,
} from "@/features/templates/hooks/useSocialMediaPostTemplates.ts";

const ROLE_RANK: Record<AdminRole, number> = { owner: 2, admin: 1, moderator: 0 };
const SIDEBAR_GROUP_STORAGE_KEYS = [
  "sidebar-reports-open",
  "sidebar-pages-open",
  "sidebar-forms-open",
  "sidebar-email-templates-open",
  "sidebar-social-media-post-templates-open",
  "sidebar-social-preview-open",
] as const;

const SIDEBAR_SECTION_IDS = ["general", "content", "builders", "analytics", "system"] as const;
type SidebarSectionId = (typeof SIDEBAR_SECTION_IDS)[number];
const ADMIN_ONLY_SECTIONS: SidebarSectionId[] = ["builders", "analytics", "system"];
const SECTION_DRAG_LABEL = {
  de: "Abschnitt verschieben",
  en: "Move section",
} as const;

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
  const { locale } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const dragHandle = (
    <DashboardDragHandle
      {...listeners}
      aria-label={SECTION_DRAG_LABEL[locale]}
      className="opacity-0 transition-opacity duration-100 group-hover/section:opacity-100"
      tabIndex={-1}
    />
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
  const sidebarMessages = messages.layout.sidebar;
  const { data: pages } = useContentPages();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/pages/*"
      storageKey="sidebar-pages-open"
      icon={<CopyIcon weight="duotone" className="w-4 h-4" />}
      label={sidebarMessages.pages}
      badge={pages?.length ?? 0}
      globalOpenState={globalOpenState}
      globalOpenVersion={globalOpenVersion}
      onOpenChange={onOpenChange}
    >
      <NavLink to="/pages" end onClick={onItemClick} className={sidebarGroupItemClass}>
        {sidebarMessages.pagesOverview}
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

function SocialPreviewGroup({
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
  const sidebarMessages = messages.layout.sidebar;
  const { data: projects } = useSocialPreviewProjects();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/system/social-preview/*"
      storageKey="sidebar-social-preview-open"
      icon={<ImageIcon weight="duotone" className="w-4 h-4" />}
      label={sidebarMessages.socialPreview}
      badge={projects?.length ?? 0}
      globalOpenState={globalOpenState}
      globalOpenVersion={globalOpenVersion}
      onOpenChange={onOpenChange}
    >
      <NavLink
        to="/system/social-preview/images"
        onClick={onItemClick}
        className={sidebarGroupItemClass}
      >
        <ImageIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
        {sidebarMessages.socialPreviewImages}
      </NavLink>
      <NavLink
        to="/system/social-preview"
        end
        onClick={onItemClick}
        className={sidebarGroupItemClass}
      >
        {sidebarMessages.socialPreviewOverview}
      </NavLink>
      {(projects ?? []).map((project) => (
        <NavLink
          key={project.id}
          to={`/system/social-preview/${project.id}`}
          onClick={onItemClick}
          className={sidebarGroupItemClass}
        >
          <ImageIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
          <span className="flex flex-col min-w-0">
            <span className="truncate">{project.name}</span>
            <span className="truncate text-xs opacity-50">
              {new Date(project.updatedAt).toLocaleDateString()}
            </span>
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
  const sidebarMessages = messages.layout.sidebar;
  const { data: forms } = useFormConfigs();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/forms/*"
      storageKey="sidebar-forms-open"
      icon={<NotebookIcon weight="duotone" className="w-4 h-4" />}
      label={sidebarMessages.formBuilder}
      badge={forms?.length ?? 0}
      globalOpenState={globalOpenState}
      globalOpenVersion={globalOpenVersion}
      onOpenChange={onOpenChange}
    >
      <NavLink to="/forms" end onClick={onItemClick} className={sidebarGroupItemClass}>
        {sidebarMessages.formsOverview}
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
  const sidebarMessages = messages.layout.sidebar;
  const { data: templates } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const navigate = useNavigate();

  return (
    <CollapsibleSidebarGroup
      routeMatch="/email-templates/*"
      storageKey="sidebar-email-templates-open"
      icon={<EnvelopeOpenIcon weight="duotone" className="w-4 h-4" />}
      label={sidebarMessages.emailTemplates}
      badge={templates?.length ?? 0}
      globalOpenState={globalOpenState}
      globalOpenVersion={globalOpenVersion}
      onOpenChange={onOpenChange}
    >
      <NavLink to="/email-templates" end onClick={onItemClick} className={sidebarGroupItemClass}>
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

function SocialMediaPostTemplatesGroup({
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
  const sidebarMessages = messages.layout.sidebar;
  const templateMessages = messages.socialMediaTemplates;
  const common = messages.common;
  const navigate = useNavigate();
  const { data: templates } = useSocialMediaPostTemplates();
  const createTemplate = useCreateSocialMediaPostTemplate();
  const deleteTemplate = useDeleteSocialMediaPostTemplate();

  type Template = NonNullable<typeof templates>[number];
  const [contextMenu, setContextMenu] = useState<{
    origin: { x: number; y: number };
    template: Template;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  return (
    <>
      <CollapsibleSidebarGroup
        routeMatch="/social-media-post-templates/*"
        storageKey="sidebar-social-media-post-templates-open"
        icon={<PaperPlaneTiltIcon weight="duotone" className="w-4 h-4" />}
        label={sidebarMessages.socialMediaPostTemplates}
        badge={templates?.length ?? 0}
        globalOpenState={globalOpenState}
        globalOpenVersion={globalOpenVersion}
        onOpenChange={onOpenChange}
      >
        <NavLink
          to="/social-media-post-templates"
          end
          onClick={onItemClick}
          className={sidebarGroupItemClass}
        >
          {sidebarMessages.socialMediaPostTemplatesOverview}
        </NavLink>
        {(templates ?? []).map((template) => (
          <NavLink
            key={template.id}
            to={`/social-media-post-templates/${template.id}`}
            onClick={onItemClick}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu({
                origin: { x: event.clientX, y: event.clientY },
                template,
              });
            }}
            className={sidebarGroupItemClass}
          >
            <PaperPlaneTiltIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="truncate">{template.name}</span>
          </NavLink>
        ))}
      </CollapsibleSidebarGroup>

      <SubMenu
        open={contextMenu !== null}
        origin={contextMenu?.origin ?? null}
        onOpenChange={(open) => {
          if (!open) setContextMenu(null);
        }}
      >
        {contextMenu ? (
          <>
            <SubMenu.Item
              icon={<FileTextIcon weight="duotone" className="h-3.5 w-3.5" />}
              onSelect={() => {
                void navigate(`/social-media-post-templates/${contextMenu.template.id}`);
              }}
            >
              {common.edit}
            </SubMenu.Item>
            <SubMenu.Item
              icon={<CopyIcon weight="duotone" className="h-3.5 w-3.5" />}
              onSelect={() => {
                void (async () => {
                  try {
                    const created = await createTemplate.mutateAsync({
                      name: `${contextMenu.template.name} (Copy)`,
                      platforms: contextMenu.template.platforms,
                      scopes: contextMenu.template.scopes,
                      bodyMastodon: contextMenu.template.bodyMastodon,
                      bodyBluesky: contextMenu.template.bodyBluesky,
                    });
                    void navigate(`/social-media-post-templates/${created.id}`);
                  } catch (err) {
                    console.error("[duplicate template]", err);
                  }
                })();
              }}
            >
              {common.duplicate}
            </SubMenu.Item>
            <SubMenu.Item separator />
            <SubMenu.Item
              disabled={contextMenu.template.isSystemTemplate}
              icon={<TrashIcon weight="duotone" className="h-3.5 w-3.5" />}
              onSelect={() => {
                setDeleteTarget(contextMenu.template);
              }}
              variant="danger"
            >
              {common.delete}
            </SubMenu.Item>
          </>
        ) : null}
      </SubMenu>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={templateMessages.deleteTemplate}
        description={`${templateMessages.deleteTemplateConfirm} (${deleteTarget?.name ?? ""})`}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={deleteTemplate.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteTemplate.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </>
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
  const sidebarMessages = messages.layout.sidebar;
  const submissions = messages.submissions;

  return (
    <CollapsibleSidebarGroup
      routeMatch="/reports/*"
      storageKey="sidebar-reports-open"
      icon={<TrayIcon weight="duotone" className="w-4 h-4" />}
      label={sidebarMessages.submissions}
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
      <NavLink
        to="/reports/automated-checks"
        onClick={onItemClick}
        className={sidebarGroupItemClass}
      >
        <RobotIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 opacity-60" />
        <span className="flex-1">{submissions.tabs.automatedChecks}</span>
      </NavLink>
    </CollapsibleSidebarGroup>
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
  const sidebarMessages = messages.layout.sidebar;
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
  const [groupStatus, setGroupStatus] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      SIDEBAR_GROUP_STORAGE_KEYS.map((key) => [key, localStorage.getItem(key) === "true"]),
    ),
  );
  const areAllGroupsOpen = SIDEBAR_GROUP_STORAGE_KEYS.every((key) => groupStatus[key]);
  const [sectionOrder, setSectionOrder] = useState<SidebarSectionId[]>(() =>
    parseSectionOrder(user?.uiPreferences?.sidebarSectionOrder ?? undefined),
  );
  const sensors = useDashboardSortableSensors({ activationDistance: 4 });

  function handleToggleAllGroups(next: boolean) {
    SIDEBAR_GROUP_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, String(next)));
    setGroupStatus(Object.fromEntries(SIDEBAR_GROUP_STORAGE_KEYS.map((key) => [key, next])));
  }

  function handleGroupOpenChange(
    storageKey: (typeof SIDEBAR_GROUP_STORAGE_KEYS)[number],
    open: boolean,
  ) {
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
            aria-label={
              areAllGroupsOpen ? sidebarMessages.collapseAllAria : sidebarMessages.expandAllAria
            }
            title={
              areAllGroupsOpen ? sidebarMessages.collapseAllAria : sidebarMessages.expandAllAria
            }
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
                  areAllGroupsOpen ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100"
                }`}
              >
                {sidebarMessages.expandAll}
              </span>
              <span
                className={`col-start-1 row-start-1 transition-all duration-200 ease-out ${
                  areAllGroupsOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
              >
                {sidebarMessages.collapseAll}
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
                  title={sidebarMessages.sectionGeneral}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <NavLink to="/" end onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<SquaresFourIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.overview}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <ReportsGroup
                    onItemClick={onItemClick}
                    globalOpenState={groupStatus["sidebar-reports-open"]}
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
                  title={sidebarMessages.sectionContent}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <NavLink to="/shops" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<StorefrontIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.shops}
                        badge={shops.length}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/categories" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<TagIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.categories}
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
                          label={sidebarMessages.landingPage}
                          active={isActive}
                        />
                      )}
                    </NavLink>
                  )}
                  {isAdmin && (
                    <PagesGroup
                      onItemClick={onItemClick}
                      globalOpenState={groupStatus["sidebar-pages-open"]}
                      onOpenChange={(open) => handleGroupOpenChange("sidebar-pages-open", open)}
                    />
                  )}
                  {isAdmin && (
                    <NavLink to="/navigations" onClick={onItemClick} className="contents">
                      {({ isActive }) => (
                        <DashboardSection.Item
                          icon={<LinkIcon weight="duotone" className="w-4 h-4" />}
                          label={sidebarMessages.navigations}
                          active={isActive}
                        />
                      )}
                    </NavLink>
                  )}
                </DashboardSection.Body>
              </DashboardSection>
            ),
            builders: (dragHandle) => (
              <DashboardSection>
                <DashboardSection.Header
                  icon={<BlueprintIcon weight="duotone" className="w-4 h-4" />}
                  title={sidebarMessages.sectionTemplates}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <FormsGroup
                    onItemClick={onItemClick}
                    globalOpenState={groupStatus["sidebar-forms-open"]}
                    onOpenChange={(open) => handleGroupOpenChange("sidebar-forms-open", open)}
                  />
                  <EmailTemplatesGroup
                    onItemClick={onItemClick}
                    globalOpenState={groupStatus["sidebar-email-templates-open"]}
                    onOpenChange={(open) =>
                      handleGroupOpenChange("sidebar-email-templates-open", open)
                    }
                  />
                  <SocialMediaPostTemplatesGroup
                    onItemClick={onItemClick}
                    globalOpenState={groupStatus["sidebar-social-media-post-templates-open"]}
                    onOpenChange={(open) =>
                      handleGroupOpenChange("sidebar-social-media-post-templates-open", open)
                    }
                  />
                  <NavLink to="/markdown-widgets" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<MarkdownLogoIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.markdownWidgets}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/footer-builder" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<SquareHalfBottomIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.footerBuilder}
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
                  title={sidebarMessages.sectionAnalytics}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <NavLink to="/analytics" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<ChartBarIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.analytics}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                </DashboardSection.Body>
              </DashboardSection>
            ),
            system: (dragHandle) => (
              <DashboardSection>
                <DashboardSection.Header
                  icon={<GearSixIcon weight="duotone" className="w-4 h-4" />}
                  title={sidebarMessages.sectionSystem}
                  addOn={dragHandle}
                />
                <DashboardSection.Body className="!gap-0.5 !p-2">
                  <NavLink to="/users" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<UsersThreeIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.users}
                        badge={users.length}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/media" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<ImageIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.media}
                        badge={media.length}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/system/settings" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<SlidersHorizontalIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.systemSettings}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink to="/system/redirect-urls" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<LinkIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.redirectUrls}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <SocialPreviewGroup
                    onItemClick={onItemClick}
                    globalOpenState={groupStatus["sidebar-social-preview-open"]}
                    onOpenChange={(open) =>
                      handleGroupOpenChange("sidebar-social-preview-open", open)
                    }
                  />
                  <NavLink to="/social-media/accounts" onClick={onItemClick} className="contents">
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<ShareNetworkIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.socialMediaAccounts}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                  <NavLink
                    to="/system/background-errors"
                    onClick={onItemClick}
                    className="contents"
                  >
                    {({ isActive }) => (
                      <DashboardSection.Item
                        icon={<BugIcon weight="duotone" className="w-4 h-4" />}
                        label={sidebarMessages.backgroundErrors}
                        active={isActive}
                      />
                    )}
                  </NavLink>
                </DashboardSection.Body>
              </DashboardSection>
            ),
          };

          return (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
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
