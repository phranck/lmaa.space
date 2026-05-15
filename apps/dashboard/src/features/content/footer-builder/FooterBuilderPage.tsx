import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import {
  ArrowClockwiseIcon,
  ColumnsPlusRightIcon,
  EyeIcon,
  PlusCircleIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { nanoid } from "nanoid";
import { useEffect, useReducer, useRef } from "react";

import type { FooterBlock, FooterColumn, FooterConfig, FooterStyle } from "@lmaa/contracts";
import { FOOTER_STYLE_DEFAULTS } from "@lmaa/contracts";
import { resolveFooterHeightPx } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useDashboardSortableSensors } from "@/components/ui/useDashboardSortableSensors.ts";
import { useI18n } from "@/context/I18nContext.tsx";
import { FRONTEND_URL } from "@/lib/env.ts";

import { FooterBlockConfigPanel } from "./FooterBlockConfigPanel.tsx";
import { FooterCanvas } from "./FooterCanvas.tsx";
import { FooterPalette } from "./FooterPalette.tsx";
import { FooterPreview } from "./FooterPreview.tsx";
import { FooterStylePane } from "./FooterStylePane.tsx";
import {
  useFooterConfig,
  useFooterPreview,
  useSaveFooterConfig,
} from "../hooks/useFooterConfig.ts";

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

function footerBuilderReducer(
  state: FooterBuilderState,
  action: FooterBuilderAction,
): FooterBuilderState {
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
    case "spacer":
      return { id: nanoid(), type: "spacer" };
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
  const controller = useFooterBuilderController(footerMessages);
  const {
    activeDrag,
    config,
    isLoading,
    isPreviewPending,
    previewUrl,
    save,
    savedOk,
    selectedBlock,
    selectedBlockId,
    selection,
    showStyle,
    handleAddColumn,
    handleBlockUpdate,
    handleChangeSpan,
    handleDeleteBlock,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleOpenStyle,
    handleReloadPreview,
    handleRemoveColumn,
    handleSave,
    handleSelectBlock,
    handleStyleChange,
    resetActiveDrag,
  } = controller;

  if (isLoading || config === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const previewHeightPx = resolveFooterHeightPx(config.style);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={footerMessages.title}>
        <FooterHeaderActions
          isError={save.isError}
          savedOk={savedOk}
          isSaving={save.isPending}
          saveErrorLabel={footerMessages.saveError}
          savedLabel={common.saved}
          savingLabel={common.saving}
          saveLabel={common.save}
          onSave={handleSave}
        />
      </PageHeader>

      <FooterBuilderWorkspace
        config={config}
        selection={selection}
        selectedBlockId={selectedBlockId}
        selectedBlock={selectedBlock}
        activeDrag={activeDrag}
        columnsTitle={footerMessages.columnsTitle}
        addColumnLabel={footerMessages.addColumn}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={resetActiveDrag}
        onAddColumn={handleAddColumn}
        onSelectBlock={handleSelectBlock}
        onDeleteBlock={handleDeleteBlock}
        onChangeSpan={handleChangeSpan}
        onRemoveColumn={handleRemoveColumn}
        onBlockUpdate={handleBlockUpdate}
        onStyleChange={handleStyleChange}
      />

      <FooterPreviewSection
        showStyle={showStyle}
        previewUrl={previewUrl}
        previewHeightPx={previewHeightPx}
        isPreviewPending={isPreviewPending}
        previewTitle={footerMessages.previewTitle}
        styleLabel={footerMessages.styleTitle}
        reloadLabel={footerMessages.reloadPreview}
        onOpenStyle={handleOpenStyle}
        onReload={handleReloadPreview}
      />
    </div>
  );
}

function useFooterBuilderController(
  footerMessages: ReturnType<typeof useI18n>["messages"]["content"]["footerBuilder"],
) {
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
    spacer: footerMessages.blockLabels.spacer,
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
      dispatch({
        activeDrag: {
          label:
            block?.type === "headline"
              ? block.text || blockTypeLabels.headline
              : block?.type === "button"
                ? block.label || blockTypeLabels.button
                : blockTypeLabels[block?.type ?? "headline"],
        },
      });
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !config) return;
    const activeId = String(active.id);

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

    if (activeId.startsWith("col:")) {
      const current = configRef.current;
      if (current) handleChange(current);
      return;
    }

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

  const selectedBlockId = selection?.kind === "block" ? selection.id : null;
  const showStyle = selection?.kind === "style";
  const selectedBlock = selectedBlockId
    ? (config?.columns.flatMap((c) => c.blocks).find((b) => b.id === selectedBlockId) ?? null)
    : null;

  return {
    activeDrag,
    config,
    isLoading,
    isPreviewPending,
    previewUrl,
    save,
    savedOk,
    selectedBlock,
    selectedBlockId,
    selection,
    showStyle,
    handleAddColumn,
    handleBlockUpdate,
    handleChangeSpan,
    handleDeleteBlock,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleOpenStyle: () => dispatch({ selection: { kind: "style" } }),
    handleReloadPreview,
    handleRemoveColumn,
    handleSave,
    handleSelectBlock: (id: string) =>
      dispatch({
        selection:
          selection?.kind === "block" && selection.id === id ? null : { kind: "block", id },
      }),
    handleStyleChange,
    resetActiveDrag: () => dispatch({ activeDrag: null }),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FooterHeaderActionsProps {
  isError: boolean;
  savedOk: boolean;
  isSaving: boolean;
  saveErrorLabel: string;
  savedLabel: string;
  savingLabel: string;
  saveLabel: string;
  onSave: () => void;
}

function FooterHeaderActions({
  isError,
  savedOk,
  isSaving,
  saveErrorLabel,
  savedLabel,
  savingLabel,
  saveLabel,
  onSave,
}: FooterHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {isError && <span className="text-xs text-red-500">{saveErrorLabel}</span>}
      {savedOk && <span className="text-xs text-green-500">{savedLabel}</span>}
      <SaveActionButton
        onClick={onSave}
        disabled={isSaving}
        busy={isSaving}
        label={isSaving ? savingLabel : saveLabel}
      />
    </div>
  );
}

interface FooterBuilderWorkspaceProps {
  config: FooterConfig;
  selection: Selection;
  selectedBlockId: string | null;
  selectedBlock: FooterBlock | null;
  activeDrag: { label: string } | null;
  columnsTitle: string;
  addColumnLabel: string;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  onAddColumn: () => void;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (colId: string, blockId: string) => void;
  onChangeSpan: (colId: string, span: number) => void;
  onRemoveColumn: (colId: string) => void;
  onBlockUpdate: (block: FooterBlock) => void;
  onStyleChange: (style: FooterStyle) => void;
}

function FooterBuilderWorkspace({
  config,
  selectedBlockId,
  selectedBlock,
  activeDrag,
  columnsTitle,
  addColumnLabel,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  onAddColumn,
  onSelectBlock,
  onDeleteBlock,
  onChangeSpan,
  onRemoveColumn,
  onBlockUpdate,
  onStyleChange,
}: FooterBuilderWorkspaceProps) {
  const sensors = useDashboardSortableSensors({ activationDistance: 6 });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="grid items-start gap-4 xl:grid-cols-[11rem_minmax(0,1fr)_18rem]">
        <FooterPalette />

        <DashboardSection className="min-w-0 overflow-hidden">
          <DashboardSection.Header
            icon={<ColumnsPlusRightIcon weight="duotone" className="size-4" />}
            title={columnsTitle}
            addOn={
              <DashboardButton
                onClick={onAddColumn}
                className="whitespace-nowrap border-dashed"
                leadingIcon={<PlusCircleIcon weight="duotone" className="size-4" />}
                variant="neutral"
              >
                {addColumnLabel}
              </DashboardButton>
            }
          />
          <DashboardSection.Body className="!gap-0">
            <div className="flex min-w-0 gap-3 overflow-x-auto pb-1">
              <SortableContext
                items={config.columns.map((c) => `col:${c.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                {config.columns.map((col) => (
                  <FooterCanvas
                    key={col.id}
                    column={col}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={onSelectBlock}
                    onDeleteBlock={(blockId) => onDeleteBlock(col.id, blockId)}
                    onChangeSpan={(span) => onChangeSpan(col.id, span)}
                    onRemoveColumn={() => onRemoveColumn(col.id)}
                  />
                ))}
              </SortableContext>
            </div>
          </DashboardSection.Body>
        </DashboardSection>

        <div className="min-w-0">
          {selectedBlock !== null ? (
            <FooterBlockConfigPanel block={selectedBlock} onChange={onBlockUpdate} />
          ) : (
            <FooterStylePane
              style={{ ...FOOTER_STYLE_DEFAULTS, ...config.style }}
              onChange={onStyleChange}
            />
          )}
        </div>
      </div>

      <FooterDragOverlay activeDrag={activeDrag} />
    </DndContext>
  );
}

function FooterDragOverlay({ activeDrag }: { activeDrag: { label: string } | null }) {
  return (
    <DragOverlay>
      {activeDrag && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-sm shadow-xl cursor-grabbing">
          <span className="font-medium text-[var(--ds-text)]">{activeDrag.label}</span>
        </div>
      )}
    </DragOverlay>
  );
}

interface FooterPreviewSectionProps {
  showStyle: boolean;
  previewUrl: string | null;
  previewHeightPx: string;
  isPreviewPending: boolean;
  previewTitle: string;
  styleLabel: string;
  reloadLabel: string;
  onOpenStyle: () => void;
  onReload: () => void;
}

function FooterPreviewSection({
  showStyle,
  previewUrl,
  previewHeightPx,
  isPreviewPending,
  previewTitle,
  styleLabel,
  reloadLabel,
  onOpenStyle,
  onReload,
}: FooterPreviewSectionProps) {
  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={<EyeIcon weight="duotone" className="size-4" />}
        title={previewTitle}
        addOn={
          <span className="flex items-center gap-2">
            <DashboardButton
              onClick={onOpenStyle}
              className={`shrink-0 ${
                showStyle
                  ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-[var(--color-primary)]"
                  : ""
              }`}
              leadingIcon={<SlidersHorizontalIcon weight="duotone" className="size-3.5" />}
              variant="neutral"
            >
              {styleLabel}
            </DashboardButton>
            <DashboardButton
              onClick={onReload}
              disabled={isPreviewPending}
              className="shrink-0"
              leadingIcon={
                <ArrowClockwiseIcon
                  weight="duotone"
                  className={`size-3.5 ${isPreviewPending ? "animate-spin" : ""}`}
                />
              }
              variant="neutral"
            >
              {reloadLabel}
            </DashboardButton>
          </span>
        }
      />
      <DashboardSection.Body className="!gap-0 !p-0 overflow-hidden rounded-b-xl">
        <FooterPreview src={previewUrl} heightPx={previewHeightPx} isLoading={isPreviewPending} />
      </DashboardSection.Body>
    </DashboardSection>
  );
}
