import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import { useAdminNav, useSaveNav } from "@/features/system/hooks/useAdminNav.ts";
import { useFormConfigs } from "@/features/templates/hooks/useFormConfig.ts";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NavId } from "@lmaa/shared";
import { useEffect, useState } from "react";
import {
  SFLine3Horizontal,
  SFPlusCircle,
  SFSquareAndArrowDownFill,
  SFXmark,
} from "sf-symbols-lib/monochrome";

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
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors touch-none"
        title={text.dragTitle}
      >
        <SFLine3Horizontal className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--ds-text)] truncate">
          {item.pageTitle ?? item.url}
        </div>
        <div className="text-xs text-[var(--ds-text-muted)] font-mono">{displayUrl}</div>
      </div>

      <input
        type="text"
        value={item.label}
        onChange={(e) => onLabelChange(item.id, e.target.value)}
        placeholder={item.pageTitle ?? item.url ?? ""}
        className="w-32 px-2 py-1 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        title={text.labelOverrideTitle}
      />

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="p-1 text-[var(--ds-text-muted)] hover:text-red-500 transition-colors"
        title={text.remove}
      >
        <SFXmark className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function NavColumn({ navId, label }: { navId: NavId; label: string }) {
  const { locale } = useI18n();
  const text = NAV_TEXT[locale];
  const staticRoutes = text.staticRoutes;
  const { data: serverItems = [], isLoading } = useAdminNav(navId);
  const { data: allPages = [] } = useContentPages();
  const { data: allForms = [] } = useFormConfigs();
  const saveNav = useSaveNav(navId);

  const [items, setItems] = useState<NavItemState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addType, setAddType] = useState<"page" | "url" | "form">("page");
  const [addPageSlug, setAddPageSlug] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addTarget, setAddTarget] = useState<"_self" | "_blank">("_self");

  useEffect(() => {
    setItems(
      serverItems.map((si) => ({
        id: si.id,
        pageSlug: si.pageSlug ?? null,
        pageTitle: si.pageTitle ?? null,
        url: si.url ?? null,
        target: (si.target as "_self" | "_blank") ?? "_self",
        label: si.label ?? "",
      })),
    );
    setDirty(false);
  }, [serverItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setDirty(true);
  }

  function handleRemove(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDirty(true);
  }

  function handleLabelChange(id: number, label: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, label } : i)));
    setDirty(true);
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
      setAddPageSlug("");
      setDirty(true);
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
    setAddPageSlug("");
    setDirty(true);
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
    setAddUrl("");
    setAddLabel("");
    setAddTarget("_self");
    setDirty(true);
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
    setDirty(true);
  }

  async function handleSave() {
    setSaveError(null);
    try {
      await saveNav.mutateAsync(
        items.map((i) => ({
          pageSlug: i.pageSlug ?? undefined,
          url: i.url ?? undefined,
          label: i.label || null,
          target: i.target,
        })),
      );
      setDirty(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : text.errorSaving);
    }
  }

  const usedPageSlugs = new Set(items.filter((i) => i.pageSlug).map((i) => i.pageSlug));
  const usedUrls = new Set(items.filter((i) => i.url).map((i) => i.url));
  const availablePages = allPages.filter((p) => !usedPageSlugs.has(p.slug));
  const availableStatics = staticRoutes.filter((r) => !usedUrls.has(r.url));
  const availableForms = allForms.filter((f) => f.slug && !usedUrls.has(`/${f.slug}`));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--ds-text)]">{label}</h3>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saveNav.isPending}
          className="flex items-center gap-1.5 h-7 px-3 text-xs border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-50 transition-colors"
        >
          <SFSquareAndArrowDownFill className="w-3 h-3" />
          {saveNav.isPending ? text.saving : text.save}
        </button>
      </div>

      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

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

      {/* Add section */}
      <div className="border-t border-[var(--ds-border)] pt-3 space-y-3">
        {/* Type toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAddType("page")}
            className={`px-3 py-1 text-xs rounded-control border transition-colors ${
              addType === "page"
                ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)] border-[var(--ds-nav-active-border)]"
                : "text-[var(--ds-text-muted)] border-[var(--ds-border)] hover:text-[var(--ds-text)]"
            }`}
          >
            {text.typePage}
          </button>
          <button
            type="button"
            onClick={() => setAddType("url")}
            className={`px-3 py-1 text-xs rounded-control border transition-colors ${
              addType === "url"
                ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)] border-[var(--ds-nav-active-border)]"
                : "text-[var(--ds-text-muted)] border-[var(--ds-border)] hover:text-[var(--ds-text)]"
            }`}
          >
            {text.typeUrl}
          </button>
        </div>

        {addType === "page" ? (
          <div className="flex items-center gap-2">
            <select
              value={addPageSlug}
              onChange={(e) => setAddPageSlug(e.target.value)}
              className="flex-1 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control px-2 py-1.5 text-[var(--ds-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{text.choosePageOrForm}</option>
              {availablePages.length > 0 && (
                <optgroup label={text.typePage}>
                  {availablePages.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title} (/{p.slug})
                    </option>
                  ))}
                </optgroup>
              )}
              {availableForms.length > 0 && (
                <optgroup label={text.forms}>
                  {availableForms.map((f) => (
                    <option key={f.name} value={`form:${f.slug}`}>
                      {f.name} (/{f.slug})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              onClick={handleAddPage}
              disabled={!addPageSlug}
              className="p-1.5 text-[var(--color-primary)] hover:opacity-80 disabled:opacity-40 transition-opacity"
              title={text.add}
            >
              <SFPlusCircle className="w-5 h-5" />
            </button>
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
                    onClick={() => handleAddStatic(r)}
                    className="px-2 py-1 text-xs bg-[var(--ds-surface-hover)] hover:bg-[var(--ds-nav-hover-bg)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] rounded border border-[var(--ds-border)] transition-colors font-mono"
                  >
                    {r.url}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder={text.urlPlaceholder}
                className="flex-1 px-2 py-1.5 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-mono"
              />
              <input
                type="text"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder={text.labelPlaceholder}
                className="w-24 px-2 py-1.5 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!addUrl.trim()}
                className="p-1.5 text-[var(--color-primary)] hover:opacity-80 disabled:opacity-40 transition-opacity"
                title={text.add}
              >
                <SFPlusCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Navigation management page for header/footer link sets.
 *
 * @returns Nav manager route component.
 */
export function NavManagerPage() {
  const { locale } = useI18n();
  const text = NAV_TEXT[locale];

  return (
    <>
      <PageHeader title={text.pageTitle} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control p-5">
          <NavColumn navId="header" label={text.headerNav} />
        </div>
        <div className="bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control p-5">
          <NavColumn navId="footer" label={text.footerNav} />
        </div>
      </div>
    </>
  );
}
