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
import type { NavId, NavItem } from "@lmaa/shared";
import { useEffect, useState } from "react";
import {
  SFLine3Horizontal,
  SFPlusCircle,
  SFSquareAndArrowDownFill,
  SFXmark,
} from "sf-symbols-lib/monochrome";

interface NavItemState {
  id: number;
  pageSlug: string;
  pageTitle: string;
  label: string;
}

function SortableNavItem({
  item,
  onRemove,
  onLabelChange,
}: {
  item: NavItemState;
  onRemove: (id: number) => void;
  onLabelChange: (id: number, label: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
        <div className="text-sm font-medium text-[var(--ds-text)] truncate">{item.pageTitle}</div>
        <div className="text-xs text-[var(--ds-text-muted)] font-mono">/{item.pageSlug}</div>
      </div>
      <input
        type="text"
        value={item.label}
        onChange={(e) => onLabelChange(item.id, e.target.value)}
        placeholder={item.pageTitle}
        className="w-36 px-2 py-1 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        title="Label-Override (leer = Seitentitel)"
      />
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
  const [addSlug, setAddSlug] = useState("");

  useEffect(() => {
    setItems(
      serverItems.map((si) => ({
        id: si.id,
        pageSlug: si.pageSlug,
        pageTitle: si.pageTitle,
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

  function handleAdd() {
    if (!addSlug) return;
    const page = allPages.find((p) => p.slug === addSlug);
    if (!page) return;
    if (items.some((i) => i.pageSlug === addSlug)) return;
    const tempId = Date.now();
    setItems((prev) => [
      ...prev,
      { id: tempId, pageSlug: page.slug, pageTitle: page.title, label: "" },
    ]);
    setAddSlug("");
    setDirty(true);
  }

  async function handleSave() {
    setSaveError(null);
    try {
      await saveNav.mutateAsync(
        items.map((i) => ({ pageSlug: i.pageSlug, label: i.label || null })),
      );
      setDirty(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
  }

  const usedSlugs = new Set(items.map((i) => i.pageSlug));
  const availablePages = allPages.filter((p) => !usedSlugs.has(p.slug));

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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add page */}
      <div className="flex items-center gap-2">
        <select
          value={addSlug}
          onChange={(e) => setAddSlug(e.target.value)}
          className="flex-1 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control px-2 py-1.5 text-[var(--ds-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        >
          <option value="">Seite hinzufügen…</option>
          {availablePages.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title} (/{p.slug})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!addSlug}
          className="p-1.5 text-[var(--color-primary)] hover:opacity-80 disabled:opacity-40 transition-opacity"
          title="Hinzufügen"
        >
          <SFPlusCircle className="w-5 h-5" />
        </button>
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
