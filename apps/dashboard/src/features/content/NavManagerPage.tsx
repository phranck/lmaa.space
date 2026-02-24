import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import { useAdminNav, useSaveNav } from "@/features/content/hooks/useAdminNav.ts";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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
  SFArrowUpRightSquare,
  SFLine3Horizontal,
  SFPlusCircle,
  SFSquareAndArrowDownFill,
  SFXmark,
} from "sf-symbols-lib/monochrome";

const STATIC_ROUTES = [
  { label: "Startseite", url: "/" },
  { label: "Shop vorschlagen", url: "/suggestion" },
  { label: "Suche", url: "/suche" },
];

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
  onTargetChange,
}: {
  item: NavItemState;
  onRemove: (id: number) => void;
  onLabelChange: (id: number, label: string) => void;
  onTargetChange: (id: number, target: "_self" | "_blank") => void;
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
        title="Verschieben"
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
        title="Label-Override (leer = Standard)"
      />

      <button
        type="button"
        onClick={() => onTargetChange(item.id, item.target === "_blank" ? "_self" : "_blank")}
        className={`p-1.5 rounded transition-colors ${
          item.target === "_blank"
            ? "text-[var(--color-primary)] bg-[var(--ds-nav-active-bg)]"
            : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
        }`}
        title={item.target === "_blank" ? "Öffnet in neuem Tab" : "Öffnet im selben Tab"}
      >
        <SFArrowUpRightSquare className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="p-1 text-[var(--ds-text-muted)] hover:text-red-500 transition-colors"
        title="Entfernen"
      >
        <SFXmark className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function NavColumn({ navId, label }: { navId: NavId; label: string }) {
  const { data: serverItems = [], isLoading } = useAdminNav(navId);
  const { data: allPages = [] } = useContentPages();
  const saveNav = useSaveNav(navId);

  const [items, setItems] = useState<NavItemState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addType, setAddType] = useState<"page" | "url">("page");
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

  function handleTargetChange(id: number, target: "_self" | "_blank") {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, target } : i)));
    setDirty(true);
  }

  function handleAddPage() {
    if (!addPageSlug) return;
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
    const staticRoute = STATIC_ROUTES.find((r) => r.url === trimmed);
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
      setSaveError(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
  }

  const usedPageSlugs = new Set(items.filter((i) => i.pageSlug).map((i) => i.pageSlug));
  const usedUrls = new Set(items.filter((i) => i.url).map((i) => i.url));
  const availablePages = allPages.filter((p) => !usedPageSlugs.has(p.slug));
  const availableStatics = STATIC_ROUTES.filter((r) => !usedUrls.has(r.url));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--ds-text)]">{label}</h3>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saveNav.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control hover:bg-[var(--ds-btn-primary-hover)] disabled:opacity-50 transition-colors"
        >
          <SFSquareAndArrowDownFill className="w-3 h-3" />
          {saveNav.isPending ? "Speichert…" : "Speichern"}
        </button>
      </div>

      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      {isLoading ? (
        <div className="text-xs text-[var(--ds-text-muted)]">Lade…</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.length === 0 && (
                <div className="text-xs text-[var(--ds-text-muted)] py-4 text-center border border-dashed border-[var(--ds-border)] rounded-control">
                  Keine Einträge
                </div>
              )}
              {items.map((item) => (
                <SortableNavItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onLabelChange={handleLabelChange}
                  onTargetChange={handleTargetChange}
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
            Seite
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
            URL
          </button>
        </div>

        {addType === "page" ? (
          <div className="flex items-center gap-2">
            <select
              value={addPageSlug}
              onChange={(e) => setAddPageSlug(e.target.value)}
              className="flex-1 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control px-2 py-1.5 text-[var(--ds-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">Seite wählen…</option>
              {availablePages.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title} (/{p.slug})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddPage}
              disabled={!addPageSlug}
              className="p-1.5 text-[var(--color-primary)] hover:opacity-80 disabled:opacity-40 transition-opacity"
              title="Hinzufügen"
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
                placeholder="https://… oder /pfad"
                className="flex-1 px-2 py-1.5 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-mono"
              />
              <input
                type="text"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder="Label"
                className="w-24 px-2 py-1.5 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={() => setAddTarget(addTarget === "_blank" ? "_self" : "_blank")}
                className={`p-1.5 rounded transition-colors ${
                  addTarget === "_blank"
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--ds-text-muted)]"
                }`}
                title={addTarget === "_blank" ? "Neuer Tab" : "Selber Tab"}
              >
                <SFArrowUpRightSquare className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!addUrl.trim()}
                className="p-1.5 text-[var(--color-primary)] hover:opacity-80 disabled:opacity-40 transition-opacity"
                title="Hinzufügen"
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

export function NavManagerPage() {
  return (
    <>
      <PageHeader title="Navigationen" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control p-5">
            <NavColumn navId="header" label="Header-Navigation" />
          </div>
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control p-5">
            <NavColumn navId="footer" label="Footer-Navigation" />
          </div>
        </div>
      </div>
    </>
  );
}
