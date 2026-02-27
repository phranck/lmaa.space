import { useI18n } from "@/context/I18nContext.tsx";
import type { FieldType } from "@lmaa/contracts";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface PaletteTileProps {
  type: FieldType;
  label: string;
}

function FieldTypeIcon({ type }: { type: FieldType }) {
  switch (type) {
    case "text":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="5" width="14" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "email":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M1.5 4.5 8 9l6.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "textarea":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 6h8M4 9h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "select":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="5" width="14" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 8l-2 2-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "multi-select":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="2" width="14" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="1" y="10" width="14" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 4h5M4 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "checkbox":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "richtext":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 5.5h8M4 8h8M4 10.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

function PaletteTile({ type, label }: PaletteTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { type },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] text-sm text-[var(--ds-text)] cursor-grab active:cursor-grabbing hover:border-[var(--color-primary)] hover:bg-[var(--ds-nav-hover-bg)] select-none transition-colors"
    >
      <span className="shrink-0 opacity-60 text-[var(--ds-text)]">
        <FieldTypeIcon type={type} />
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

/**
 * Sidebar palette listing all draggable field type tiles.
 *
 * @returns Palette panel for drag-and-drop field creation.
 */
export function FieldPalette() {
  const { messages } = useI18n();
  const ft = messages.formBuilder.fieldTypes;

  const fieldTypes: { type: FieldType; label: string }[] = [
    { type: "text", label: ft.text },
    { type: "email", label: ft.email },
    { type: "textarea", label: ft.textarea },
    { type: "select", label: ft.select },
    { type: "multi-select", label: ft.multiSelect },
    { type: "checkbox", label: ft.checkbox },
    { type: "richtext", label: ft.richtext },
  ];

  return (
    <div className="flex flex-col gap-1.5 p-4 bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-card min-w-44">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-subtle)] mb-1 px-1">
        Felder
      </p>
      {fieldTypes.map(({ type, label }) => (
        <PaletteTile key={type} type={type} label={label} />
      ))}
    </div>
  );
}
