import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SFLine3Horizontal from "sf-symbols-lib/monochrome/SFLine3Horizontal";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";

import type { FooterColumn } from "@lmaa/contracts";

import { Dropdown } from "@/components/ui/Dropdown.tsx";

import { FooterBlockItem } from "./FooterBlockItem.tsx";

const SPAN_OPTIONS = [
  { value: "1", label: "Schmal" },
  { value: "2", label: "Normal" },
  { value: "3", label: "Breit" },
];

interface Props {
  column: FooterColumn;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onChangeSpan: (span: number) => void;
  onRemoveColumn: () => void;
}

/**
 * Sortable + droppable canvas for a single footer column.
 * The outer div is sortable (column reordering via drag handle).
 * The inner droppable area accepts block palette drops.
 * Analogous to BuilderCanvas in the form builder.
 */
export function FooterCanvas({
  column,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onChangeSpan,
  onRemoveColumn,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `col:${column.id}` });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: `canvas:${column.id}` });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const blockIds = column.blocks.map((b) => `block:${column.id}:${b.id}`);

  return (
    <div ref={setSortableRef} style={sortableStyle} className="flex flex-col gap-2 min-w-[180px] flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] touch-none"
          title="Spalte verschieben"
        >
          <SFLine3Horizontal className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1">
          <Dropdown
            value={String(column.span)}
            onChange={(v) => onChangeSpan(Number(v))}
            options={SPAN_OPTIONS}
          />
        </div>
        <button
          type="button"
          onClick={onRemoveColumn}
          className="shrink-0 text-[var(--ds-text-muted)] hover:text-red-500 transition-colors"
          title="Spalte entfernen"
        >
          <SFXmark className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Droppable area */}
      <div
        ref={setDroppableRef}
        className={`flex-1 min-h-48 rounded-card border-2 border-dashed transition-colors ${
          isOver
            ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)]"
            : "border-[var(--ds-border)] bg-[var(--ds-surface)]"
        }`}
      >
        {column.blocks.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-48 p-8">
            <p className="text-sm text-[var(--ds-text-subtle)] text-center">Block hierher ziehen</p>
          </div>
        ) : (
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            <div className="p-3 flex flex-col gap-2">
              {column.blocks.map((block) => (
                <FooterBlockItem
                  key={block.id}
                  block={block}
                  columnId={column.id}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onDelete={() => onDeleteBlock(block.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
