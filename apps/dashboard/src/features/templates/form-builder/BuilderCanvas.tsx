import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SquaresFourIcon } from "@phosphor-icons/react";

import type { FormRow } from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui";

import { useI18n } from "@/context/I18nContext.tsx";
import { BuilderRow } from "@/features/templates/form-builder/BuilderRow.tsx";

interface BuilderCanvasProps {
  rows: FormRow[];
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onDeleteField: (rowId: string, fieldId: string) => void;
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
}: BuilderCanvasProps) {
  const { messages } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  const rowIds = rows.map((r: FormRow) => r.id);

  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={<SquaresFourIcon weight="duotone" className="w-4 h-4" />}
        title={messages.formBuilder.canvasTitle}
      />
      <div
        ref={setNodeRef}
        className={`min-h-64 border-2 border-dashed rounded-b-xl transition-colors ${
          isOver
            ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)]"
            : "border-[var(--ds-border)] bg-transparent"
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
            <div className="p-3 flex flex-col gap-2">
              {rows.map((row: FormRow) => (
                <BuilderRow
                  key={row.id}
                  row={row}
                  selectedFieldId={selectedFieldId}
                  onSelectField={onSelectField}
                  onDeleteField={onDeleteField}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </DashboardSection>
  );
}
