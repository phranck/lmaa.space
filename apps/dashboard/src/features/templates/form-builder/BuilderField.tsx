import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SealWarningIcon } from "@phosphor-icons/react";

import type { FormField } from "@lmaa/contracts";

import { useI18n } from "@/context/I18nContext.tsx";

interface BuilderFieldProps {
  field: FormField;
  rowId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const FIELD_TYPE_ABBREVIATIONS: Record<string, string> = {
  text: "Txt",
  email: "Em",
  textarea: "Ta",
  select: "Sel",
  "multi-select": "MSl",
  checkbox: "Cb",
  richtext: "Md",
  button: "Btn",
  password: "Pw",
  headline: "H",
  separator: "—",
  paragraph: "Abs",
};

const INPUT_TYPE_ABBREVIATIONS: Record<string, string> = {
  text: "Txt",
  email: "Em",
  password: "Pw",
  url: "Url",
  tel: "Tel",
  date: "Dat",
  number: "Nr",
};

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
    opacity: isDragging ? 0 : 1,
  };

  const typeLabels: Record<string, string> = {
    text: ft.text,
    email: ft.email,
    textarea: ft.textarea,
    select: ft.select,
    "multi-select": ft.multiSelect,
    checkbox: ft.checkbox,
    richtext: ft.richtext,
    button: ft.button,
    password: ft.password,
    headline: ft.headline,
    separator: ft.separator,
    paragraph: ft.paragraph,
  };

  const fieldAbbr =
    field.type === "text"
      ? (INPUT_TYPE_ABBREVIATIONS[field.inputType ?? "text"] ?? "Txt")
      : (FIELD_TYPE_ABBREVIATIONS[field.type] ?? field.type.slice(0, 3));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group/field relative flex w-full items-center px-3 py-2.5 rounded-control border text-sm cursor-pointer text-left ${
        (field.span ?? 12) <= 2 ? "justify-center" : "justify-start gap-2"
      } ${
        isSelected
          ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)]"
          : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] hover:border-[var(--color-primary)]"
      }`}
    >
      {/* Normal layout: label left, badge right */}
      {(field.span ?? 12) > 2 ? (
        <>
          <span className="flex-1 min-w-0 truncate font-medium text-[var(--ds-text)]">
            {field.label || <span className="opacity-50 italic">Kein Label</span>}
            {field.required && field.type !== "richtext" && (
              <SealWarningIcon
                weight="duotone"
                className="inline-block ml-1 w-3 h-3 text-red-500 align-middle"
              />
            )}
            {field.type === "richtext" && field.content && (
              <span className="ml-2 text-xs font-normal opacity-40 truncate">
                {field.content.slice(0, 40).replace(/[#*_`\n]/g, " ")}…
              </span>
            )}
          </span>
          <span
            title={typeLabels[field.type] ?? field.type}
            className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--ds-border-subtle)] text-[var(--ds-text)]/60"
          >
            {fieldAbbr}
          </span>
        </>
      ) : (
        /* Narrow layout (1–2/12): only centered badge */
        <span
          title={typeLabels[field.type] ?? field.type}
          className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--ds-border-subtle)] text-[var(--ds-text)]/60"
        >
          {fieldAbbr}
        </span>
      )}

      {/* Delete button — only visible on hover, positioned at top-right corner */}
      <button
        type="button"
        aria-label={messages.formBuilder.removeField}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--ds-surface)] text-[var(--ds-text-subtle)] hover:text-[var(--ds-danger-text)] opacity-0 group-hover/field:opacity-100"
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06z"
          />
        </svg>
      </button>
    </div>
  );
}
