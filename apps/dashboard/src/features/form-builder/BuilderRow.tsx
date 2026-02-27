import { BuilderField } from "@/features/form-builder/BuilderField.tsx";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import type { FormField, FormRow } from "@lmaa/contracts";

interface BuilderRowProps {
  row: FormRow;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onDeleteField: (rowId: string, fieldId: string) => void;
  onDeleteRow: (rowId: string) => void;
}

/**
 * Horizontal row container for one or two builder fields.
 *
 * @param props - Row data and interaction callbacks.
 * @returns Row with sortable fields and a row-delete control.
 */
export function BuilderRow({
  row,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onDeleteRow,
}: BuilderRowProps) {
  const sortableIds = row.fields.map((f: FormField) => `field:${row.id}:${f.id}`);

  return (
    <div className="group relative flex items-stretch gap-2 p-3 rounded-card border border-[var(--ds-border)] bg-[var(--ds-surface)]">
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-1 gap-2">
          {row.fields.map((field: FormField) => (
            <div key={field.id} className={field.width === "half" ? "flex-1" : "flex-1"}>
              <BuilderField
                field={field}
                rowId={row.id}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(row.id, field.id)}
              />
            </div>
          ))}
        </div>
      </SortableContext>

      {/* Delete row button — shown on hover */}
      <button
        type="button"
        aria-label="Zeile entfernen"
        onClick={() => onDeleteRow(row.id)}
        className="shrink-0 self-center opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-control border border-[var(--ds-border)] text-[var(--ds-text-subtle)] hover:text-red-500 hover:border-red-300 transition-all text-sm"
      >
        ✕
      </button>
    </div>
  );
}
