import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { FieldType } from "@lmaa/contracts";

import { CubeIcon, StarIcon } from "@phosphor-icons/react";
import { FormSection } from "@lmaa/ui";

import { useI18n } from "@/context/I18nContext.tsx";

interface PaletteTileProps {
  /** dnd-kit drag id suffix — not necessarily a FieldType (e.g. "categories-select") */
  paletteId: string;
  /** FieldType used for the icon only */
  iconType: FieldType;
  label: string;
}

/**
 * Renders a small SVG icon that visually represents a form field type.
 *
 * @param props      - Component props.
 * @param props.type - The field type whose icon should be rendered.
 * @returns An inline SVG icon, or nothing for unknown types.
 */
export function FieldTypeIcon({ type }: { type: FieldType }) {
  switch (type) {
    case "text":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect
            x="1"
            y="5"
            width="14"
            height="6"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M4 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "email":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect
            x="1"
            y="3"
            width="14"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M1.5 4.5 8 9l6.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "textarea":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect
            x="1"
            y="2"
            width="14"
            height="12"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M4 6h8M4 9h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "select":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect
            x="1"
            y="5"
            width="14"
            height="6"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M11 8l-2 2-2-2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
          <path
            d="M5 8l2.5 2.5L11 5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "richtext":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M4 5.5h8M4 8h8M4 10.5h5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "password":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="4" y="7" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8" cy="10.5" r="1" fill="currentColor" />
        </svg>
      );
    case "headline":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 4h3M2 12h3M3.5 4v8M11 4h3M11 12h3M12.5 4v8M2.5 8h11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "button":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="4" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "separator":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M1 8h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="3 2"
          />
        </svg>
      );
    case "paragraph":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 4h12M2 7h12M2 10h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

/**
 * Draggable palette tile for a single field type.
 *
 * Registers itself with dnd-kit under the id `"palette:<type>"` so that
 * the form builder can identify palette drops in `handleDragEnd`.
 *
 * @param props       - Component props.
 * @param props.type  - The field type this tile represents.
 * @param props.label - Human-readable German label shown inside the tile.
 * @returns A draggable tile card.
 */
function PaletteTile({ paletteId, iconType, label }: PaletteTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${paletteId}`,
    data: { paletteId },
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
      className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg)] text-sm text-[var(--ds-text)] cursor-grab active:cursor-grabbing hover:border-[var(--color-primary)] hover:bg-[var(--ds-nav-hover-bg)] select-none transition-colors"
    >
      <span className="shrink-0 opacity-60 text-[var(--ds-text)]">
        <FieldTypeIcon type={iconType} />
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

  // Standard fields — sorted alphabetically by German label
  const standardFields: { paletteId: string; iconType: FieldType; label: string }[] = [
    { paletteId: "select", iconType: "select", label: ft.select }, // Auswahl
    { paletteId: "button", iconType: "button", label: ft.button }, // Button
    { paletteId: "checkbox", iconType: "checkbox", label: ft.checkbox }, // Checkbox
    { paletteId: "text", iconType: "text", label: ft.text }, // Input
    { paletteId: "richtext", iconType: "richtext", label: ft.richtext }, // Markdown Editor
    { paletteId: "multi-select", iconType: "multi-select", label: ft.multiSelect }, // Mehrfachauswahl
    { paletteId: "paragraph", iconType: "paragraph", label: ft.paragraph }, // Textabsatz
    { paletteId: "textarea", iconType: "textarea", label: ft.textarea }, // Textbereich
    { paletteId: "separator", iconType: "separator", label: ft.separator }, // Trennlinie
    { paletteId: "headline", iconType: "headline", label: ft.headline }, // Überschrift
  ];

  // Special data-source fields — sorted alphabetically
  const specialFields: { paletteId: string; iconType: FieldType; label: string }[] = [
    { paletteId: "categories-select", iconType: "multi-select", label: ft.categoriesSelect }, // Kategorien
    { paletteId: "regions-select", iconType: "multi-select", label: ft.regionsSelect }, // Regionen
  ];

  return (
    <div className="flex flex-col gap-3 min-w-44">
      <FormSection>
        <FormSection.Header
          icon={<CubeIcon weight="duotone" className="w-4 h-4" />}
          title={messages.formBuilder.paletteGroups.standard}
        />
        <FormSection.Body>
          {standardFields.map(({ paletteId, iconType, label }) => (
            <PaletteTile key={paletteId} paletteId={paletteId} iconType={iconType} label={label} />
          ))}
        </FormSection.Body>
      </FormSection>
      <FormSection>
        <FormSection.Header
          icon={<StarIcon weight="duotone" className="w-4 h-4" />}
          title={messages.formBuilder.paletteGroups.special}
        />
        <FormSection.Body>
          {specialFields.map(({ paletteId, iconType, label }) => (
            <PaletteTile key={paletteId} paletteId={paletteId} iconType={iconType} label={label} />
          ))}
        </FormSection.Body>
      </FormSection>
    </div>
  );
}
