import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import SFPlusCircle from "sf-symbols-lib/monochrome/SFPlusCircle";
import SFSquareAndArrowDownFill from "sf-symbols-lib/monochrome/SFSquareAndArrowDownFill";

import type { FooterBlock, FooterColumn, FooterConfig, FooterStyle } from "@lmaa/contracts";
import { FOOTER_STYLE_DEFAULTS } from "@lmaa/contracts";

import { Card } from "@/components/ui/Card.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";

import { FooterBlockConfigPanel } from "./footer-builder/FooterBlockConfigPanel.tsx";
import { FooterCanvas } from "./footer-builder/FooterCanvas.tsx";
import { FooterPalette } from "./footer-builder/FooterPalette.tsx";
import { FooterPreview } from "./footer-builder/FooterPreview.tsx";
import { FooterStylePane } from "./footer-builder/FooterStylePane.tsx";
import { useFooterConfig, useFooterPreview, useSaveFooterConfig } from "./hooks/useFooterConfig.ts";

const PREVIEW_DEBOUNCE_MS = 600;

type Selection = { kind: "style" } | { kind: "block"; id: string } | null;
type FooterBlockType = FooterBlock["type"];

const BLOCK_TYPE_LABELS: Record<FooterBlockType, string> = {
  headline: "Überschrift",
  text: "Markdown",
  button: "Button",
  "footer-nav": "Footer-Nav",
  separator: "Trennlinie",
};

function buildDefaultBlock(type: FooterBlockType): FooterBlock {
  switch (type) {
    case "headline":
      return { id: nanoid(), type: "headline", text: "Überschrift" };
    case "text":
      return { id: nanoid(), type: "text", markdown: "" };
    case "button":
      return { id: nanoid(), type: "button", label: "Button", href: "/", external: false, style: "filled" };
    case "footer-nav":
      return { id: nanoid(), type: "footer-nav", direction: "vertical" };
    case "separator":
      return { id: nanoid(), type: "separator" };
  }
}

/**
 * Parses a droppable/sortable id into the column and optionally block it refers to.
 * Handles `canvas:${colId}` and `block:${colId}:${blockId}`.
 */
function parseTargetId(id: string): { colId: string; blockId?: string } | null {
  if (id.startsWith("canvas:")) return { colId: id.slice("canvas:".length) };
  if (id.startsWith("block:")) {
    const parts = id.split(":");
    return { colId: parts[1], blockId: parts[2] };
  }
  return null;
}

function getDragLabel(type: FooterBlockType, block?: FooterBlock): string {
  if (block?.type === "headline") return block.text || BLOCK_TYPE_LABELS.headline;
  if (block?.type === "button") return block.label || BLOCK_TYPE_LABELS.button;
  return BLOCK_TYPE_LABELS[type];
}

/**
 * Footer builder page with palette sidebar, per-column canvases, and a config panel.
 * Built to the same patterns as FormBuilderPage: drag from palette to canvas,
 * click block to configure, click preview header to open style settings.
 */
export function FooterBuilderPage() {
  const { data: loaded, isLoading } = useFooterConfig();
  const save = useSaveFooterConfig();
  const preview = useFooterPreview();

  const [config, setConfig] = useState<FooterConfig | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{ label: string } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const configRef = useRef(config);
  configRef.current = config;

  const refreshPreview = useCallback((cfg: FooterConfig) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      previewRef.current.mutate(cfg, {
        onSuccess: (res) => setPreviewHtml(res.html),
      });
    }, PREVIEW_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (loaded && config === null) {
      setConfig(loaded);
      refreshPreview(loaded);
    }
  }, [loaded, config, refreshPreview]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleChange(updated: FooterConfig) {
    setConfig(updated);
    refreshPreview(updated);
  }

  function updateColumns(columns: FooterColumn[]) {
    if (!config) return;
    handleChange({ ...config, columns });
  }

  function handleStyleChange(style: FooterStyle) {
    if (!config) return;
    handleChange({ ...config, style });
  }

  function handleAddColumn() {
    if (!config) return;
    updateColumns([...config.columns, { id: nanoid(), span: 2, blocks: [] }]);
  }

  function handleRemoveColumn(colId: string) {
    if (!config) return;
    const col = config.columns.find((c) => c.id === colId);
    if (col && selection?.kind === "block" && col.blocks.some((b) => b.id === selection.id)) {
      setSelection(null);
    }
    updateColumns(config.columns.filter((c) => c.id !== colId));
  }

  function handleChangeSpan(colId: string, span: number) {
    if (!config) return;
    updateColumns(config.columns.map((c) => (c.id === colId ? { ...c, span } : c)));
  }

  function handleDeleteBlock(colId: string, blockId: string) {
    if (!config) return;
    if (selection?.kind === "block" && selection.id === blockId) setSelection(null);
    updateColumns(
      config.columns.map((c) =>
        c.id === colId ? { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) } : c,
      ),
    );
  }

  function handleBlockUpdate(updatedBlock: FooterBlock) {
    if (!config) return;
    updateColumns(
      config.columns.map((c) => ({
        ...c,
        blocks: c.blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)),
      })),
    );
  }

  // ---------------------------------------------------------------------------
  // DnD handlers
  // ---------------------------------------------------------------------------

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith("palette:")) {
      const type = id.replace("palette:", "") as FooterBlockType;
      setActiveDrag({ label: BLOCK_TYPE_LABELS[type] });
    } else if (id.startsWith("block:")) {
      const [, colId, blockId] = id.split(":");
      const block = config?.columns.find((c) => c.id === colId)?.blocks.find((b) => b.id === blockId);
      setActiveDrag({ label: getDragLabel(block?.type ?? "headline", block) });
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !config) return;
    const activeId = String(active.id);

    // Column reordering — live feedback
    if (activeId.startsWith("col:")) {
      const overId = String(over.id);
      if (!overId.startsWith("col:")) return;
      const fromColId = activeId.replace("col:", "");
      const toColId = overId.replace("col:", "");
      if (fromColId === toColId) return;
      const oldIdx = config.columns.findIndex((c) => c.id === fromColId);
      const newIdx = config.columns.findIndex((c) => c.id === toColId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      setConfig({ ...config, columns: arrayMove(config.columns, oldIdx, newIdx) });
      return;
    }

    if (!activeId.startsWith("block:")) return;

    const [, fromColId, blockId] = activeId.split(":");
    const target = parseTargetId(String(over.id));
    if (!target || target.colId === fromColId) return;

    // Cross-column movement — update state immediately for live feedback
    const fromCol = config.columns.find((c) => c.id === fromColId);
    const toCol = config.columns.find((c) => c.id === target.colId);
    if (!fromCol || !toCol) return;

    const block = fromCol.blocks.find((b) => b.id === blockId);
    if (!block) return;

    const overBlockIdx = target.blockId
      ? toCol.blocks.findIndex((b) => b.id === target.blockId)
      : -1;
    const insertAt = overBlockIdx >= 0 ? overBlockIdx : toCol.blocks.length;

    const newCols = config.columns.map((c) => {
      if (c.id === fromColId) return { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) };
      if (c.id === target.colId) {
        const blocks = [...c.blocks];
        blocks.splice(insertAt, 0, block);
        return { ...c, blocks };
      }
      return c;
    });

    setConfig({ ...config, columns: newCols });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    if (!config) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Column reorder — handled by dragOver, just persist and refresh
    if (activeId.startsWith("col:")) {
      const current = configRef.current;
      if (current) handleChange(current);
      return;
    }

    // Palette drop → create new block in target column
    if (activeId.startsWith("palette:")) {
      const type = activeId.replace("palette:", "") as FooterBlockType;
      const target = parseTargetId(overId);
      if (!target) return;

      const newBlock = buildDefaultBlock(type);
      const newCols = config.columns.map((c) => {
        if (c.id !== target.colId) return c;
        const blocks = [...c.blocks];
        if (target.blockId) {
          const insertIdx = blocks.findIndex((b) => b.id === target.blockId);
          blocks.splice(insertIdx >= 0 ? insertIdx : blocks.length, 0, newBlock);
        } else {
          blocks.push(newBlock);
        }
        return { ...c, blocks };
      });
      handleChange({ ...config, columns: newCols });
      setSelection({ kind: "block", id: newBlock.id });
      return;
    }

    // Block drag — within-column reorder (cross-column handled by dragOver)
    if (activeId.startsWith("block:")) {
      const [, fromColId, blockId] = activeId.split(":");
      const target = parseTargetId(overId);

      if (!target || target.colId !== fromColId) {
        // Cross-column already handled → just refresh preview
        refreshPreview(config);
        return;
      }

      if (!target.blockId || target.blockId === blockId) return;

      const col = config.columns.find((c) => c.id === fromColId);
      if (!col) return;

      const oldIdx = col.blocks.findIndex((b) => b.id === blockId);
      const newIdx = col.blocks.findIndex((b) => b.id === target.blockId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const newCols = config.columns.map((c) =>
        c.id === fromColId ? { ...c, blocks: arrayMove(c.blocks, oldIdx, newIdx) } : c,
      );
      handleChange({ ...config, columns: newCols });
    }
  }

  function handleSave() {
    if (!config) return;
    save.mutate(config, {
      onSuccess: () => {
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2000);
      },
    });
  }

  if (isLoading || config === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const selectedBlockId = selection?.kind === "block" ? selection.id : null;
  const showStyle = selection?.kind === "style";
  const selectedBlock = selectedBlockId
    ? (config.columns.flatMap((c) => c.blocks).find((b) => b.id === selectedBlockId) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Footer-Builder">
        <div className="flex items-center gap-2">
          {save.isError && <span className="text-xs text-red-500">Fehler beim Speichern</span>}
          {savedOk && <span className="text-xs text-green-500">Gespeichert</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-50 transition-colors"
          >
            <SFSquareAndArrowDownFill className="w-4 h-4" />
            {save.isPending ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </PageHeader>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="flex gap-4 items-start">
          {/* Palette sidebar */}
          <div className="shrink-0">
            <FooterPalette />
          </div>

          {/* Column canvases */}
          <div className="flex-1 min-w-0 flex gap-3 overflow-auto">
            <SortableContext
              items={config.columns.map((c) => `col:${c.id}`)}
              strategy={horizontalListSortingStrategy}
            >
            {config.columns.map((col) => (
              <FooterCanvas
                key={col.id}
                column={col}
                selectedBlockId={selectedBlockId}
                onSelectBlock={(id) =>
                  setSelection((prev) =>
                    prev?.kind === "block" && prev.id === id ? null : { kind: "block", id },
                  )
                }
                onDeleteBlock={(blockId) => handleDeleteBlock(col.id, blockId)}
                onChangeSpan={(span) => handleChangeSpan(col.id, span)}
                onRemoveColumn={() => handleRemoveColumn(col.id)}
              />
            ))}
            </SortableContext>

            <button
              type="button"
              onClick={handleAddColumn}
              className="flex items-center gap-1.5 shrink-0 self-start px-3 py-2 rounded-control border border-dashed border-[var(--ds-border)] text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] hover:border-[var(--color-primary)] transition-colors whitespace-nowrap"
            >
              <SFPlusCircle className="w-4 h-4" />
              Spalte
            </button>
          </div>

          {/* Config panel — always visible: block props when selected, style otherwise */}
          <div className="shrink-0 w-72">
            {selectedBlock !== null ? (
              <FooterBlockConfigPanel block={selectedBlock} onChange={handleBlockUpdate} />
            ) : (
              <FooterStylePane
                style={{ ...FOOTER_STYLE_DEFAULTS, ...config.style }}
                onChange={handleStyleChange}
              />
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDrag && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-sm shadow-xl cursor-grabbing">
              <span className="font-medium text-[var(--ds-text)]">{activeDrag.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Preview card — click header to open style settings */}
      <Card>
        <button
          type="button"
          onClick={() => setSelection({ kind: "style" })}
          className={`w-full text-left px-4 py-2.5 border-b border-[var(--ds-border)] text-xs font-semibold uppercase tracking-wider transition-colors ${
            showStyle
              ? "text-[var(--color-primary)]"
              : "text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)]"
          }`}
        >
          Vorschau
        </button>
        <FooterPreview html={previewHtml} isLoading={preview.isPending} />
      </Card>
    </div>
  );
}
