import { useI18n } from "@/context/I18nContext.tsx";
import { BuilderRow } from "@/features/form-builder/BuilderRow.tsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { FormRow } from "@lmaa/contracts";

interface BuilderCanvasProps {
  rows: FormRow[];
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onDeleteField: (rowId: string, fieldId: string) => void;
  onDeleteRow: (rowId: string) => void;
}

/**
 * Main droppable canvas displaying the ordered list of form rows.
 *
 * @param props - Row data and interaction callbacks.
 * @returns Sortable canvas area accepting drops from the field palette.
 */
export function BuilderCanvas({
  rows,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onDeleteRow,
}: BuilderCanvasProps) {
  const { messages } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  const rowIds = rows.map((r: FormRow) => r.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-64 rounded-card border-2 border-dashed transition-colors ${
        isOver
          ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)]"
          : "border-[var(--ds-border)] bg-[var(--ds-surface)]"
      }`}
    >
      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-64 p-8">
          <p className="text-sm text-[var(--ds-text-subtle)] text-center">
            {messages.formBuilder.empty}
          </p>
        </div>
      ) : (
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="p-4 flex flex-col gap-3">
            {rows.map((row: FormRow) => (
              <BuilderRow
                key={row.id}
                row={row}
                selectedFieldId={selectedFieldId}
                onSelectField={onSelectField}
                onDeleteField={onDeleteField}
                onDeleteRow={onDeleteRow}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
