import {
  DndContext,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BrowsersIcon,
  FileIcon,
  NotebookIcon,
  SquareHalfBottomIcon,
} from "@phosphor-icons/react";
import { forwardRef, useEffect, useImperativeHandle, useReducer, useRef, useState } from "react";

import type { NavId } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui";

import {
  CreateActionButton,
  RemoveActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import {
  DashboardDragHandle,
  DashboardInput,
  DashboardSegmentedControl,
} from "@/components/ui/DashboardControls.tsx";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useDashboardSortableSensors } from "@/components/ui/useDashboardSortableSensors.ts";
import { useI18n } from "@/context/I18nContext.tsx";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import { useAdminNav, useSaveNav } from "@/features/system/hooks/useAdminNav.ts";
import { useFormConfigs } from "@/features/templates/hooks/useFormConfig.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

const NAV_TEXT = {
  de: {
    pageTitle: "Navigationen",
    headerNav: "Header-Navigation",
    footerNav: "Footer-Navigation",
    staticRoutes: [
      { label: "Startseite", url: "/" },
      { label: "Shop vorschlagen", url: "/suggestion" },
      { label: "Suche", url: "/search" },
    ],
    dragTitle: "Verschieben",
    labelOverrideTitle: "Label-Override (leer = Standard)",
    openNewTab: "Öffnet in neuem Tab",
    openSameTab: "Öffnet im selben Tab",
    remove: "Entfernen",
    save: "Speichern",
    saving: "Speichert…",
    load: "Lade…",
    noEntries: "Keine Einträge",
    typePage: "Seite",
    typeUrl: "URL",
    choosePage: "Seite wählen…",
    choosePageOrForm: "Seite oder Formular wählen…",
    add: "Hinzufügen",
    urlPlaceholder: "https://… oder /pfad",
    labelPlaceholder: "Label",
    newTab: "Neuer Tab",
    sameTab: "Selber Tab",
    errorSaving: "Fehler beim Speichern",
    forms: "Formulare",
  },
  en: {
    pageTitle: "Navigations",
    headerNav: "Header navigation",
    footerNav: "Footer navigation",
    staticRoutes: [
      { label: "Home", url: "/" },
      { label: "Suggest shop", url: "/suggestion" },
      { label: "Search", url: "/search" },
    ],
    dragTitle: "Drag",
    labelOverrideTitle: "Label override (empty = default)",
    openNewTab: "Opens in new tab",
    openSameTab: "Opens in same tab",
    remove: "Remove",
    save: "Save",
    saving: "Saving…",
    load: "Loading…",
    noEntries: "No entries",
    typePage: "Page",
    typeUrl: "URL",
    choosePage: "Select page…",
    choosePageOrForm: "Select page or form…",
    add: "Add",
    urlPlaceholder: "https://… or /path",
    labelPlaceholder: "Label",
    newTab: "New tab",
    sameTab: "Same tab",
    errorSaving: "Error while saving",
    forms: "Forms",
  },
} as const;

type NavText = (typeof NAV_TEXT)[keyof typeof NAV_TEXT];

interface NavItemState {
  id: number;
  pageSlug: string | null;
  pageTitle: string | null;
  url: string | null;
  target: "_self" | "_blank";
  label: string;
}

function SortableNavItem({
  item,
  onRemove,
  onLabelChange,
  text,
}: {
  item: NavItemState;
  onRemove: (id: number) => void;
  onLabelChange: (id: number, label: string) => void;
  text: NavText;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayUrl = item.url ?? (item.pageSlug ? `/${item.pageSlug}` : "");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control"
    >
      <DashboardDragHandle
        {...attributes}
        {...listeners}
        aria-label={text.dragTitle}
        title={text.dragTitle}
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--ds-text)] truncate">
          {item.pageTitle ?? item.url}
        </div>
        <div className="text-xs text-[var(--ds-text-muted)] font-mono">{displayUrl}</div>
      </div>

      <DashboardInput
        type="text"
        value={item.label}
        onChange={(e) => onLabelChange(item.id, e.target.value)}
        placeholder={item.pageTitle ?? item.url ?? ""}
        className="w-44 text-xs"
        title={text.labelOverrideTitle}
      />

      <RemoveActionButton
        onClick={() => onRemove(item.id)}
        title={text.remove}
        label={text.remove}
        iconOnly
      />
    </div>
  );
}

export interface NavColumnHandle {
  save: () => Promise<boolean>;
  hasDirty: () => boolean;
}

interface NavColumnProps {
  navId: NavId;
  onDirtyChange?: (dirty: boolean) => void;
}

const NavColumn = forwardRef<NavColumnHandle, NavColumnProps>(function NavColumn(
  { navId, onDirtyChange },
  ref,
) {
  const { locale } = useI18n();
  const text = NAV_TEXT[locale];
  const staticRoutes = text.staticRoutes;
  const { data: serverItems = [], isLoading } = useAdminNav(navId);
  const { data: allPages = [] } = useContentPages();
  const { data: allForms = [] } = useFormConfigs();
  const saveNav = useSaveNav(navId);

  interface NavColumnState {
    items: NavItemState[];
    dirty: boolean;
    addType: "page" | "url" | "form";
    addPageSlug: string;
    addUrl: string;
    addLabel: string;
    addTarget: "_self" | "_blank";
  }

  const [state, dispatch] = useReducer(
    (prev: NavColumnState, action: Partial<NavColumnState>): NavColumnState => ({ ...prev, ...action }),
    {
      items: [],
      dirty: false,
      addType: "page",
      addPageSlug: "",
      addUrl: "",
      addLabel: "",
      addTarget: "_self",
    },
  );
  const { items, dirty, addType, addPageSlug, addUrl, addLabel, addTarget } = state;

  const setItems = (updater: NavItemState[] | ((prev: NavItemState[]) => NavItemState[])) => {
    dispatch({ items: typeof updater === "function" ? updater(items) : updater });
  };

  useEffect(() => {
    dispatch({
      items: serverItems.map((si) => ({
        id: si.id,
        pageSlug: si.pageSlug ?? null,
        pageTitle: si.pageTitle ?? null,
        url: si.url ?? null,
        target: (si.target as "_self" | "_blank") ?? "_self",
        label: si.label ?? "",
      })),
      dirty: false,
    });
  }, [serverItems]);

  const sensors = useDashboardSortableSensors();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    dispatch({ dirty: true });
  }

  function handleRemove(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    dispatch({ dirty: true });
  }

  function handleLabelChange(id: number, label: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, label } : i)));
    dispatch({ dirty: true });
  }

  function handleAddPage() {
    if (!addPageSlug) return;
    // Check if it's a form slug (prefixed with "form:")
    if (addPageSlug.startsWith("form:")) {
      const formSlug = addPageSlug.slice(5);
      const form = allForms.find((f) => f.slug === formSlug);
      if (!form?.slug) return;
      const url = `/${form.slug}`;
      if (items.some((i) => i.url === url)) return;
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          pageSlug: null,
          pageTitle: form.name,
          url,
          target: "_self",
          label: "",
        },
      ]);
      dispatch({ addPageSlug: "" });
      dispatch({ dirty: true });
      return;
    }
    const page = allPages.find((p) => p.slug === addPageSlug);
    if (!page) return;
    if (items.some((i) => i.pageSlug === addPageSlug)) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        pageSlug: page.slug,
        pageTitle: page.title,
        url: null,
        target: "_self",
        label: "",
      },
    ]);
    dispatch({ addPageSlug: "" });
    dispatch({ dirty: true });
  }

  function handleAddUrl() {
    const trimmed = addUrl.trim();
    if (!trimmed) return;

    // Check for static route shortcut
    const staticRoute = staticRoutes.find((r) => r.url === trimmed);
    const derivedLabel = addLabel.trim() || staticRoute?.label || "";

    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        pageSlug: null,
        pageTitle: derivedLabel || trimmed,
        url: trimmed,
        target: addTarget,
        label: derivedLabel,
      },
    ]);
    dispatch({ addUrl: "", addLabel: "", addTarget: "_self", dirty: true });
  }

  function handleAddStatic(route: { label: string; url: string }) {
    if (items.some((i) => i.url === route.url)) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        pageSlug: null,
        pageTitle: route.label,
        url: route.url,
        target: "_self",
        label: "",
      },
    ]);
    dispatch({ dirty: true });
  }

  async function handleSave(): Promise<boolean> {
    if (!dirty) return true;
    try {
      await saveNav.mutateAsync(
        items.map((i) => ({
          pageSlug: i.pageSlug ?? undefined,
          url: i.url ?? undefined,
          label: i.label || null,
          target: i.target,
        })),
      );
      dispatch({ dirty: false });
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useImperativeHandle(
    ref,
    () => ({
      save: handleSave,
      hasDirty: () => dirty,
    }),
    [dirty, items],
  );

  const usedPageSlugs = new Set<string>();
  const usedUrls = new Set<string>();
  for (const item of items) {
    if (item.pageSlug) {
      usedPageSlugs.add(item.pageSlug);
    }
    if (item.url) {
      usedUrls.add(item.url);
    }
  }
  const availablePages = allPages.filter((p) => !usedPageSlugs.has(p.slug));
  const availableStatics = staticRoutes.filter((r) => !usedUrls.has(r.url));
  const availableForms = allForms.filter((f) => f.slug && !usedUrls.has(`/${f.slug}`));

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="text-xs text-[var(--ds-text-muted)]">{text.load}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.length === 0 && (
                <div className="text-xs text-[var(--ds-text-muted)] py-4 text-center border border-dashed border-[var(--ds-border)] rounded-control">
                  {text.noEntries}
                </div>
              )}
              {items.map((item) => (
                <SortableNavItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onLabelChange={handleLabelChange}
                  text={text}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <NavColumnAddSection
        addType={addType}
        addPageSlug={addPageSlug}
        addUrl={addUrl}
        addLabel={addLabel}
        availablePages={availablePages}
        availableForms={availableForms}
        availableStatics={availableStatics}
        text={text}
        onTypeChange={(type) => dispatch({ addType: type })}
        onPageSlugChange={(slug) => dispatch({ addPageSlug: slug })}
        onUrlChange={(url) => dispatch({ addUrl: url })}
        onLabelChange={(label) => dispatch({ addLabel: label })}
        onAddPage={handleAddPage}
        onAddUrl={handleAddUrl}
        onAddStatic={handleAddStatic}
      />
    </div>
  );
});

interface NavColumnAddSectionProps {
  addType: "page" | "url" | "form";
  addPageSlug: string;
  addUrl: string;
  addLabel: string;
  availablePages: { slug: string; title: string }[];
  availableForms: { name: string; slug: string | null }[];
  availableStatics: { label: string; url: string }[];
  text: NavText;
  onTypeChange: (type: "page" | "url" | "form") => void;
  onPageSlugChange: (slug: string) => void;
  onUrlChange: (url: string) => void;
  onLabelChange: (label: string) => void;
  onAddPage: () => void;
  onAddUrl: () => void;
  onAddStatic: (route: { label: string; url: string }) => void;
}

function NavColumnAddSection({
  addType,
  addPageSlug,
  addUrl,
  addLabel,
  availablePages,
  availableForms,
  availableStatics,
  text,
  onTypeChange,
  onPageSlugChange,
  onUrlChange,
  onLabelChange,
  onAddPage,
  onAddUrl,
  onAddStatic,
}: NavColumnAddSectionProps) {
  return (
    <div className="border-t border-[var(--ds-border)] pt-3 space-y-3">
      {/* Type toggle */}
      <DashboardSegmentedControl
        value={addType === "form" ? "page" : addType}
        onValueChange={(value) => onTypeChange(value)}
        options={[
          { value: "page", label: text.typePage },
          { value: "url", label: text.typeUrl },
        ]}
        size="compact"
        variant="outline"
      />

      {addType === "page" ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Dropdown
              value={addPageSlug}
              onChange={onPageSlugChange}
              searchable
              searchPlaceholder={text.choosePageOrForm}
              options={[
                { value: "", label: text.choosePageOrForm },
                ...availablePages.map(
                  (p): DropdownOption => ({
                    value: p.slug,
                    label: `${p.title} (/${p.slug})`,
                    icon: <FileIcon weight="duotone" className="size-3.5" />,
                  }),
                ),
                ...availableForms.map(
                  (f): DropdownOption => ({
                    value: `form:${f.slug}`,
                    label: `${f.name} (/${f.slug})`,
                    icon: <NotebookIcon weight="duotone" className="size-3.5" />,
                  }),
                ),
              ]}
            />
          </div>
          <CreateActionButton
            onClick={onAddPage}
            disabled={!addPageSlug}
            title={text.add}
            label={text.add}
            iconOnly
          />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Static route shortcuts */}
          {availableStatics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableStatics.map((r) => (
                <button
                  key={r.url}
                  type="button"
                  onClick={() => onAddStatic(r)}
                  className="px-2 py-1 text-xs bg-[var(--ds-surface-hover)] hover:bg-[var(--ds-nav-hover-bg)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] rounded border border-[var(--ds-border)] font-mono"
                >
                  {r.url}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <DashboardInput
              type="text"
              value={addUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder={text.urlPlaceholder}
              className="min-w-0 flex-1 font-mono text-xs"
            />
            <DashboardInput
              type="text"
              value={addLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder={text.labelPlaceholder}
              className="w-24 text-xs"
            />
            <CreateActionButton
              onClick={onAddUrl}
              disabled={!addUrl.trim()}
              title={text.add}
              label={text.add}
              iconOnly
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Navigation management page for header/footer link sets.
 *
 * @returns Nav manager route component.
 */
export function NavManagerPage() {
  const { locale, messages } = useI18n();
  const common = messages.common;
  const text = NAV_TEXT[locale];

  const headerRef = useRef<NavColumnHandle>(null);
  const footerRef = useRef<NavColumnHandle>(null);
  const [headerDirty, setHeaderDirty] = useState(false);
  const [footerDirty, setFooterDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { phase: savedPhase, show: showSaved } = useSaveNotification();

  const isDirty = headerDirty || footerDirty;

  async function handleSave() {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    const [headerOk, footerOk] = await Promise.all([
      headerRef.current?.save() ?? Promise.resolve(true),
      footerRef.current?.save() ?? Promise.resolve(true),
    ]);
    setIsSaving(false);
    if (headerOk && footerOk) showSaved();
  }

  useKeyboardSave(handleSave, isDirty && !isSaving);

  return (
    <>
      <PageHeader title={text.pageTitle}>
        <SaveNotification phase={savedPhase} label={common.saved} />
        <SaveActionButton
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          busy={isSaving}
          label={isSaving ? common.saving : common.save}
        />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DashboardSection>
          <DashboardSection.Header
            icon={<BrowsersIcon weight="duotone" className="size-4" />}
            title={text.headerNav}
          />
          <DashboardSection.Body>
            <NavColumn ref={headerRef} navId="header" onDirtyChange={setHeaderDirty} />
          </DashboardSection.Body>
        </DashboardSection>
        <DashboardSection>
          <DashboardSection.Header
            icon={<SquareHalfBottomIcon weight="duotone" className="size-4" />}
            title={text.footerNav}
          />
          <DashboardSection.Body>
            <NavColumn ref={footerRef} navId="footer" onDirtyChange={setFooterDirty} />
          </DashboardSection.Body>
        </DashboardSection>
      </div>
    </>
  );
}
