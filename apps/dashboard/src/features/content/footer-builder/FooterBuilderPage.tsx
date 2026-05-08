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
import { ArrowClockwiseIcon, DownloadIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { nanoid } from "nanoid";
import { useEffect, useReducer, useRef } from "react";

import type { FooterBlock, FooterColumn, FooterConfig, FooterStyle } from "@lmaa/contracts";
import { FOOTER_STYLE_DEFAULTS } from "@lmaa/contracts";
import { resolveFooterHeightPx } from "@lmaa/shared";

import { Card } from "@/components/ui/Card.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { FRONTEND_URL } from "@/lib/env.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

import { FooterBlockConfigPanel } from "./FooterBlockConfigPanel.tsx";
import { FooterCanvas } from "./FooterCanvas.tsx";
import { FooterPalette } from "./FooterPalette.tsx";
import { FooterPreview } from "./FooterPreview.tsx";
import { FooterStylePane } from "./FooterStylePane.tsx";
import { useFooterConfig, useFooterPreview, useSaveFooterConfig } from "../hooks/useFooterConfig.ts";

type Selection = { kind: "style" } | { kind: "block"; id: string } | null;
type FooterBlockType = FooterBlock["type"];

interface FooterBuilderState {
  config: FooterConfig | null;
  selection: Selection;
  previewUrl: string | null;
  savedOk: boolean;
  activeDrag: { label: string } | null;
}

type FooterBuilderAction = Partial<FooterBuilderState>;

function footerBuilderReducer(state: FooterBuilderState, action: FooterBuilderAction): FooterBuilderState {
  return { ...state, ...action };
}

function buildDefaultBlock(type: FooterBlockType): FooterBlock {
  switch (type) {
    case "headline":
      return { id: nanoid(), type: "headline", text: "" };
    case "text":
      return { id: nanoid(), type: "text", markdown: "" };
    case "button":
      return {
        id: nanoid(),
        type: "button",
        label: "",
        href: "/",
        external: false,
        style: "filled",
      };
    case "footer-nav":
      return { id: nanoid(), type: "footer-nav", direction: "vertical" };
    case "separator":
      return { id: nanoid(), type: "separator" };
    case "social-media":
      return { id: nanoid(), type: "social-media", align: "center", iconSize: "md" };
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

function buildFooterPreviewUrl(token: string) {
  return `${FRONTEND_URL}/preview/footer?token=${token}`;
}

/**
 * Footer builder page with palette sidebar, per-column canvases, and a config panel.
 * Built to the same drag-and-drop builder patterns: drag from palette to canvas,
 * click block to configure, click preview header to open style settings.
 */
export function FooterBuilderPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const footerMessages = messages.content.footerBuilder;
  const { data: loaded, isLoading } = useFooterConfig();
  const save = useSaveFooterConfig();
  const { mutate: createPreviewSession, isPending: isPreviewPending } = useFooterPreview();

  const [state, dispatch] = useReducer(footerBuilderReducer, {
    config: null,
    selection: null,
    previewUrl: null,
    savedOk: false,
    activeDrag: null,
  });
  const { config, selection, previewUrl, savedOk, activeDrag } = state;
  const blockTypeLabels: Record<FooterBlockType, string> = {
    headline: footerMessages.blockLabels.headline,
    text: footerMessages.blockLabels.markdown,
    button: footerMessages.blockLabels.button,
    "footer-nav": footerMessages.blockLabels.footerNav,
    separator: footerMessages.blockLabels.separator,
    "social-media": footerMessages.blockLabels.socialMedia,
  };

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (loaded && config === null) {
      dispatch({ config: loaded });
      createPreviewSession(loaded, {
        onSuccess: ({ token }) => dispatch({ previewUrl: buildFooterPreviewUrl(token) }),
      });
    }
  }, [loaded, config, createPreviewSession]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleChange(updated: FooterConfig) {
    dispatch({ config: updated });
  }

  function handleReloadPreview() {
    if (!config) return;
    createPreviewSession(config, {
      onSuccess: ({ token }) => dispatch({ previewUrl: buildFooterPreviewUrl(token) }),
    });
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
      dispatch({ selection: null });
    }
    updateColumns(config.columns.filter((c) => c.id !== colId));
  }

  function handleChangeSpan(colId: string, span: number) {
    if (!config) return;
    updateColumns(config.columns.map((c) => (c.id === colId ? { ...c, span } : c)));
  }

  function handleDeleteBlock(colId: string, blockId: string) {
    if (!config) return;
    if (selection?.kind === "block" && selection.id === blockId) dispatch({ selection: null });
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
      dispatch({ activeDrag: { label: blockTypeLabels[type] } });
    } else if (id.startsWith("block:")) {
      const [, colId, blockId] = id.split(":");
      const block = config?.columns
        .find((c) => c.id === colId)
        ?.blocks.find((b) => b.id === blockId);
      dispatch({ activeDrag: {
        label:
          block?.type === "headline"
            ? block.text || blockTypeLabels.headline
            : block?.type === "button"
              ? block.label || blockTypeLabels.button
              : blockTypeLabels[block?.type ?? "headline"],
      } });
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
      dispatch({ config: { ...config, columns: arrayMove(config.columns, oldIdx, newIdx) } });
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

    dispatch({ config: { ...config, columns: newCols } });
  }

  function handleDragEnd(event: DragEndEvent) {
    dispatch({ activeDrag: null });
    if (!config) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Column reorder — handled by dragOver, just persist
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
      dispatch({ selection: { kind: "block", id: newBlock.id } });
      return;
    }

    // Block drag — within-column reorder (cross-column handled by dragOver)
    if (activeId.startsWith("block:")) {
      const [, fromColId, blockId] = activeId.split(":");
      const target = parseTargetId(overId);

      if (!target || target.colId !== fromColId) return;

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
        dispatch({ savedOk: true });
        setTimeout(() => dispatch({ savedOk: false }), 2000);
      },
    });
  }

  useKeyboardSave(handleSave, config !== null && !save.isPending);

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
  const previewHeightPx = resolveFooterHeightPx(config.style);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={footerMessages.title}>
        <div className="flex items-center gap-2">
          {save.isError && <span className="text-xs text-red-500">{footerMessages.saveError}</span>}
          {savedOk && <span className="text-xs text-green-500">{common.saved}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-50"
          >
            <DownloadIcon weight="duotone" className="w-4 h-4" />
            {save.isPending ? common.saving : common.save}
          </button>
        </div>
      </PageHeader>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => dispatch({ activeDrag: null })}
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
                    dispatch({
                      selection: selection?.kind === "block" && selection.id === id ? null : { kind: "block", id },
                    })
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
              className="flex items-center gap-1.5 shrink-0 self-start px-3 py-2 rounded-control border border-dashed border-[var(--ds-border)] text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] hover:border-[var(--color-primary)] whitespace-nowrap"
            >
              <PlusCircleIcon weight="duotone" className="w-4 h-4" />
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

      <FooterPreviewCard
        showStyle={showStyle}
        previewUrl={previewUrl}
        previewHeightPx={previewHeightPx}
        isPreviewPending={isPreviewPending}
        onOpenStyle={() => dispatch({ selection: { kind: "style" } })}
        onReload={handleReloadPreview}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FooterPreviewCardProps {
  showStyle: boolean;
  previewUrl: string | null;
  previewHeightPx: string;
  isPreviewPending: boolean;
  onOpenStyle: () => void;
  onReload: () => void;
}

function FooterPreviewCard({
  showStyle,
  previewUrl,
  previewHeightPx,
  isPreviewPending,
  onOpenStyle,
  onReload,
}: FooterPreviewCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--ds-border)]">
        <button
          type="button"
          onClick={onOpenStyle}
          className={`min-w-0 flex-1 text-left text-xs font-semibold uppercase tracking-wider ${
            showStyle
              ? "text-[var(--color-primary)]"
              : "text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)]"
          }`}
        >
          Vorschau
        </button>
        <button
          type="button"
          onClick={onReload}
          disabled={isPreviewPending}
          className="flex items-center justify-center gap-1.5 h-7 px-3 text-xs font-medium border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] rounded-control hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)] disabled:opacity-50"
        >
          <ArrowClockwiseIcon
            weight="duotone"
            className={`w-3.5 h-3.5 ${isPreviewPending ? "animate-spin" : ""}`}
          />
          Reload
        </button>
      </div>
      <FooterPreview src={previewUrl} heightPx={previewHeightPx} isLoading={isPreviewPending} />
    </Card>
  );
}
