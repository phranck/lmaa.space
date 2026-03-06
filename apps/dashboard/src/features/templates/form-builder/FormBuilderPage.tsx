import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { BuilderCanvas } from "@/features/templates/form-builder/BuilderCanvas.tsx";
import { FieldConfigPanel } from "@/features/templates/form-builder/FieldConfigPanel.tsx";
import { FieldPalette } from "@/features/templates/form-builder/FieldPalette.tsx";
import { exportFormConfigSingle } from "@/features/templates/hooks/formConfigExport.ts";
import { useFormConfig, useSaveFormConfig } from "@/features/templates/hooks/useFormConfig.ts";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { FieldType, FormField, FormRow } from "@lmaa/contracts";
import { useEffect, useRef, useState } from "react";
import { SFSquareAndArrowDownFill, SFSquareAndArrowUp } from "sf-symbols-lib/monochrome";

const FORM_NAME = "suggestion-form";

/**
 * Returns the default human-readable label for a given field type.
 *
 * @param type - The field type.
 * @returns The German display label used when a new field is created.
 */
function defaultFieldLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    text: "Input Text",
    email: "E-Mail",
    textarea: "Textbereich",
    select: "Auswahl",
    "multi-select": "Mehrfachauswahl",
    checkbox: "Checkbox",
    richtext: "Markdown Editor",
    button: "Button",
    password: "Input Passwort",
    headline: "Überschrift",
    separator: "Trennlinie",
    paragraph: "Textabsatz",
  };
  return labels[type];
}

/**
 * Calculates the remaining free column span in a 12-column grid row.
 *
 * @param row - The row to inspect.
 * @returns Number of free columns (0–12).
 */
function rowFreeSpan(row: FormRow): number {
  const used = row.fields.reduce((sum, f) => sum + (f.span ?? 12), 0);
  return Math.max(0, 12 - used);
}

/**
 * Creates a new {@link FormField} with a random UUID and sensible defaults.
 *
 * @param type - The field type to create.
 * @param span - Column span in the 12-column grid. Defaults to 12 (full width).
 * @returns A ready-to-use FormField instance.
 */
function makeNewField(type: FieldType, span = 12): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label: defaultFieldLabel(type),
    required: false,
    span,
  };
}

/**
 * Wraps a single field in a new {@link FormRow} with a random UUID.
 *
 * @param field - The initial field to place in the row.
 * @returns A new FormRow containing the given field.
 */
function makeNewRow(field: FormField): FormRow {
  return { id: crypto.randomUUID(), fields: [field] };
}

/**
 * Form builder page combining palette, canvas and config panel.
 *
 * Drag from the palette to append a new row. Click a field to configure it.
 * Save commits the current rows to the backend via PUT.
 *
 * @returns Full-page form builder UI.
 */
export function FormBuilderPage() {
  const { messages } = useI18n();
  const m = messages.formBuilder;

  const { data: config, isLoading } = useFormConfig(FORM_NAME);
  const saveMutation = useSaveFormConfig(FORM_NAME);

  const [rows, setRows] = useState<FormRow[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [showExportWarning, setShowExportWarning] = useState(false);
  // Tracks the last row we moved the dragged row INTO during onDragOver.
  // Prevents oscillation: without this, every pointer-move event would swap
  // the rows back because resolvedOverId stays the same after the first move.
  const lastOverRowId = useRef<string | null>(null);

  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    field?: FormField;
    row?: FormRow;
    paletteType?: FieldType;
  } | null>(null);

  // Sync server state into local rows once loaded
  useEffect(() => {
    if (config !== undefined) {
      setRows(config?.rows ?? []);
      setIsDirty(false);
    }
  }, [config]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Find the currently selected field across all rows
  const selectedField =
    selectedFieldId !== null
      ? (rows.flatMap((r) => r.fields).find((f) => f.id === selectedFieldId) ?? null)
      : null;

  /**
   * Captures the active drag item on drag-start so the {@link DragOverlay}
   * can render a floating preview of the correct element.
   *
   * @param event - The dnd-kit drag-start event.
   */
  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);

    if (id.startsWith("palette:")) {
      setActiveDrag({ id, paletteType: id.replace("palette:", "") as FieldType });
      return;
    }

    if (id.startsWith("field:")) {
      const [, rowId, fieldId] = id.split(":");
      const row = rows.find((r) => r.id === rowId);
      const field = row?.fields.find((f) => f.id === fieldId);
      setActiveDrag({ id, field });
      return;
    }

    const row = rows.find((r) => r.id === id);
    setActiveDrag({ id, row });
    lastOverRowId.current = null;
  }

  /**
   * Resolves a dnd-kit over-id to a plain row id.
   * Handles the three possible forms:
   *   - plain row id (already resolved)
   *   - "free:{rowId}"  — free-span placeholder inside a row
   *   - "field:{rowId}:{fieldId}" — field inside a row
   */
  function resolveRowId(overId: string): string {
    if (overId.startsWith("free:")) return overId.slice("free:".length);
    if (overId.startsWith("field:")) return overId.split(":")[1];
    return overId;
  }

  /**
   * Updates the row order during drag so that the visual position tracks the
   * pointer in real time. This is the standard dnd-kit pattern for sortable
   * lists — without onDragOver the DOM positions do not update, making the
   * final over-id in onDragEnd unreliable.
   *
   * Only row-level reordering is handled here; palette drops and field
   * reordering within a row are handled in onDragEnd.
   */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    if (activeId.startsWith("field:") || activeId.startsWith("palette:")) return;

    const resolvedOverId = resolveRowId(String(over.id));

    // Skip if the target row hasn't changed — prevents oscillation where rapid
    // onDragOver events alternately swap and un-swap the same two rows.
    if (resolvedOverId === lastOverRowId.current || resolvedOverId === activeId) return;

    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === activeId);
      const newIndex = prev.findIndex((r) => r.id === resolvedOverId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    setIsDirty(true);

    lastOverRowId.current = resolvedOverId;
  }

  /**
   * Handles all drag-end events from the DnD context.
   *
   * - Palette → row with free span: appends field to that row.
   * - Palette → canvas / full row: creates a new row at the bottom.
   * - Field ID → field ID (same row): reorders fields horizontally.
   *
   * Row reordering is handled by onDragOver; nothing to do here for rows.
   *
   * @param event - The dnd-kit drag-end event.
   */
  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    lastOverRowId.current = null;
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);

    // Drop from palette
    if (activeId.startsWith("palette:")) {
      const type = activeId.replace("palette:", "") as FieldType;
      const overId = String(over.id);

      // Drop onto an existing row with free span → append to that row
      const resolvedId = resolveRowId(overId);
      const targetRow = rows.find((r) => r.id === resolvedId);
      if (targetRow) {
        const free = rowFreeSpan(targetRow);
        if (free > 0) {
          const newField = makeNewField(type, free);
          setRows((prev) =>
            prev.map((r) =>
              r.id === targetRow.id ? { ...r, fields: [...r.fields, newField] } : r,
            ),
          );
          setIsDirty(true);
          setSelectedFieldId(newField.id);
          return;
        }
      }

      // Default: create new row at bottom
      const newField = makeNewField(type);
      const newRow = makeNewRow(newField);
      setRows((prev) => [...prev, newRow]);
      setIsDirty(true);
      setSelectedFieldId(newField.id);
      return;
    }

    const overId = String(over.id);

    // All field-drag cases
    if (activeId.startsWith("field:")) {
      const [, activeRowId, activeFieldId] = activeId.split(":");
      // Resolve whatever over target (free:rowId, field:rowId:fieldId, plain rowId) to a row ID
      const targetRowId = resolveRowId(overId);

      if (activeRowId === targetRowId) {
        // Same row: horizontal reorder
        if (overId.startsWith("field:")) {
          const overFieldId = overId.split(":")[2];
          setRows((prev) =>
            prev.map((row) => {
              if (row.id !== activeRowId) return row;
              const oldIdx = row.fields.findIndex((f) => f.id === activeFieldId);
              const newIdx = row.fields.findIndex((f) => f.id === overFieldId);
              if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return row;
              return { ...row, fields: arrayMove(row.fields, oldIdx, newIdx) };
            }),
          );
          setIsDirty(true);
        }
      } else {
        // Cross-row: move field to target row
        setRows((prev) => {
          const sourceRow = prev.find((r) => r.id === activeRowId);
          const field = sourceRow?.fields.find((f) => f.id === activeFieldId);
          if (!field) return prev;
          const targetRow = prev.find((r) => r.id === targetRowId);
          if (!targetRow) return prev;
          const free = rowFreeSpan(targetRow);
          if (free <= 0) return prev;
          const movedField = { ...field, span: Math.min(field.span ?? 12, free) };
          return prev
            .map((row) => {
              if (row.id === activeRowId)
                return { ...row, fields: row.fields.filter((f) => f.id !== activeFieldId) };
              if (row.id === targetRowId) return { ...row, fields: [...row.fields, movedField] };
              return row;
            })
            .filter((row) => row.fields.length > 0);
        });
        setIsDirty(true);
      }
    }
  }

  /**
   * Toggles the selected field. Clicking the same field again deselects it.
   *
   * @param fieldId - The ID of the field to select or deselect.
   */
  function handleSelectField(fieldId: string) {
    setSelectedFieldId((prev) => (prev === fieldId ? null : fieldId));
  }

  /**
   * Removes a field from its row. If the field was selected, the selection is
   * cleared. Rows that become empty are removed automatically.
   *
   * @param rowId   - The ID of the containing row.
   * @param fieldId - The ID of the field to delete.
   */
  function handleDeleteField(rowId: string, fieldId: string) {
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
    setRows((prev) =>
      prev
        .map((row) => {
          if (row.id !== rowId) return row;
          return { ...row, fields: row.fields.filter((f) => f.id !== fieldId) };
        })
        .filter((row) => row.fields.length > 0),
    );
    setIsDirty(true);
  }

  /**
   * Replaces the stale version of a field with the updated one across all rows.
   *
   * @param updated - The modified field returned by {@link FieldConfigPanel}.
   */
  function handleFieldChange(updated: FormField) {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        fields: row.fields.map((f) => (f.id === updated.id ? updated : f)),
      })),
    );
    setIsDirty(true);
  }

  /**
   * Persists the current rows to the backend via {@link useSaveFormConfig}.
   *
   * Shows a temporary success or error status message after the request
   * completes. The success indicator auto-dismisses after 3 seconds.
   */
  function handleSave() {
    setSaveStatus("idle");
    saveMutation.mutate(
      { rows },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          setIsDirty(false);
          setTimeout(() => setSaveStatus("idle"), 3000);
        },
        onError: (err) => {
          setSaveStatus("error");
          console.error("[FormBuilder] Save failed:", err);
        },
      },
    );
  }

  function handleExport() {
    if (!config) return;
    if (isDirty) {
      setShowExportWarning(true);
      setTimeout(() => setShowExportWarning(false), 3000);
      return;
    }
    exportFormConfigSingle(config.name, config.slug ?? undefined, rows, config.submissionConfig);
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title={m.title} />
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={m.title}>
        <div className="flex items-center gap-3">
          {showExportWarning && (
            <span className="text-sm text-amber-600 font-medium">{m.exportUnsavedWarning}</span>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={!config}
            className="flex items-center gap-2 px-4 py-1.5 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] transition-colors disabled:opacity-40"
          >
            <SFSquareAndArrowUp className="w-3.5 h-3.5" />
            {m.exportForm}
          </button>
          {saveStatus === "saved" && (
            <span className="text-sm text-green-600 font-medium">{m.saved}</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-600 font-medium">{m.saveError}</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-50 transition-colors"
          >
            <SFSquareAndArrowDownFill className="w-3.5 h-3.5" />
            {saveMutation.isPending ? messages.common.saving : m.save}
          </button>
        </div>
      </PageHeader>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveDrag(null);
          lastOverRowId.current = null;
        }}
      >
        <div className="flex gap-4 items-start">
          {/* Palette sidebar */}
          <div className="shrink-0">
            <FieldPalette />
          </div>

          {/* Canvas */}
          <div className="flex-1 min-w-0">
            <BuilderCanvas
              rows={rows}
              selectedFieldId={selectedFieldId}
              onSelectField={handleSelectField}
              onDeleteField={handleDeleteField}
            />
          </div>

          {/* Config panel — only shown when a field is selected */}
          {selectedField !== null && (
            <div className="shrink-0 w-72">
              <FieldConfigPanel
                field={selectedField}
                onChange={handleFieldChange}
                allFields={rows.flatMap((r) => r.fields).map((f) => ({ id: f.id, label: f.label }))}
              />
            </div>
          )}
        </div>

        {/* Floating drag preview rendered above everything */}
        <DragOverlay>
          {activeDrag?.field && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-sm shadow-xl ring-1 ring-[var(--color-primary)]/30 cursor-grabbing">
              <span className="flex-1 min-w-0 truncate font-medium text-[var(--ds-text)]">
                {activeDrag.field.label}
              </span>
              <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--ds-border)] text-[var(--ds-text-subtle)]">
                {activeDrag.field.type.slice(0, 3)}
              </span>
            </div>
          )}
          {activeDrag?.row && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] text-sm shadow-xl cursor-grabbing">
              {activeDrag.row.fields.map((f) => (
                <span
                  key={f.id}
                  className="px-2 py-0.5 rounded bg-[var(--ds-border)] text-xs text-[var(--ds-text)] truncate max-w-32"
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}
          {activeDrag?.paletteType && (
            <div className="px-3 py-2 rounded-control border border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-sm font-medium text-[var(--ds-text)] shadow-xl cursor-grabbing">
              {defaultFieldLabel(activeDrag.paletteType)}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
