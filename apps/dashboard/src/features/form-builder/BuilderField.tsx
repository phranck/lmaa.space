import { useI18n } from "@/context/I18nContext.tsx";
import type { FormField } from "@lmaa/contracts";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface BuilderFieldProps {
  field: FormField;
  rowId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

/**
 * Sortable field card displayed inside a builder row.
 *
 * @param props - Field data, selection state and interaction callbacks.
 * @returns Draggable field card with label, type badge and controls.
 */
export function BuilderField({ field, rowId, isSelected, onSelect, onDelete }: BuilderFieldProps) {
  const { messages } = useI18n();
  const ft = messages.formBuilder.fieldTypes;

  const sortableId = `field:${rowId}:${field.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { fieldId: field.id, rowId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const typeLabels: Record<string, string> = {
    text: ft.text,
    email: ft.email,
    textarea: ft.textarea,
    select: ft.select,
    "multi-select": ft.multiSelect,
    checkbox: ft.checkbox,
    richtext: ft.richtext,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-control border text-sm cursor-pointer transition-colors ${
        isSelected
          ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)]"
          : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] hover:border-[var(--color-primary)]"
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label="Feld verschieben"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-grab active:cursor-grabbing text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] p-0.5 rounded"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
          <circle cx="4" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="4" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="4" cy="13" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {/* Label */}
      <span className="flex-1 min-w-0 font-medium text-[var(--ds-text)] truncate">
        {field.label || <span className="opacity-50 italic">Kein Label</span>}
        {field.required && field.type !== "richtext" && <span className="ml-1 text-red-500">*</span>}
        {field.type === "richtext" && field.content && (
          <span className="ml-2 text-xs font-normal opacity-40 truncate">
            {field.content.slice(0, 40).replace(/[#*_`\n]/g, " ")}…
          </span>
        )}
      </span>

      {/* Type badge */}
      <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--ds-border)] text-[var(--ds-text-subtle)]">
        {typeLabels[field.type] ?? field.type}
      </span>

      {/* Delete button */}
      <button
        type="button"
        aria-label="Feld entfernen"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-[var(--ds-text-subtle)] hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
