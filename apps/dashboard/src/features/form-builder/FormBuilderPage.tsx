import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { BuilderCanvas } from "@/features/form-builder/BuilderCanvas.tsx";
import { FieldConfigPanel } from "@/features/form-builder/FieldConfigPanel.tsx";
import { FieldPalette } from "@/features/form-builder/FieldPalette.tsx";
import { useFormConfig, useSaveFormConfig } from "@/features/form-builder/hooks/useFormConfig.ts";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { FieldType, FormField, FormRow } from "@lmaa/contracts";
import { useEffect, useState } from "react";

const FORM_NAME = "suggestion-form";

function defaultFieldLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    text: "Text",
    email: "E-Mail",
    textarea: "Textbereich",
    select: "Auswahl",
    "multi-select": "Mehrfachauswahl",
    checkbox: "Checkbox",
    richtext: "Textblock",
  };
  return labels[type];
}

function makeNewField(type: FieldType): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label: defaultFieldLabel(type),
    required: false,
    width: "full",
  };
}

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

  // Sync server state into local rows once loaded
  useEffect(() => {
    if (config !== undefined) {
      setRows(config?.rows ?? []);
    }
  }, [config]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Find the currently selected field across all rows
  const selectedField =
    selectedFieldId !== null
      ? (rows.flatMap((r) => r.fields).find((f) => f.id === selectedFieldId) ?? null)
      : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);

    // Drop from palette → create new row at bottom
    if (activeId.startsWith("palette:")) {
      const type = activeId.replace("palette:", "") as FieldType;
      const newField = makeNewField(type);
      const newRow = makeNewRow(newField);
      setRows((prev) => [...prev, newRow]);
      setSelectedFieldId(newField.id);
      return;
    }

    // In-canvas row reorder: active and over are both row ids
    const overId = String(over.id);
    if (!activeId.startsWith("field:") && !overId.startsWith("field:")) {
      const oldIndex = rows.findIndex((r) => r.id === activeId);
      const newIndex = rows.findIndex((r) => r.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setRows((prev) => arrayMove(prev, oldIndex, newIndex));
      }
      return;
    }

    // Field reorder within a row (horizontal sort)
    if (activeId.startsWith("field:") && overId.startsWith("field:")) {
      const [, activeRowId, activeFieldId] = activeId.split(":");
      const [, overRowId, overFieldId] = overId.split(":");

      if (activeRowId === overRowId) {
        setRows((prev) =>
          prev.map((row) => {
            if (row.id !== activeRowId) return row;
            const oldIdx = row.fields.findIndex((f) => f.id === activeFieldId);
            const newIdx = row.fields.findIndex((f) => f.id === overFieldId);
            if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return row;
            return { ...row, fields: arrayMove(row.fields, oldIdx, newIdx) };
          }),
        );
      }
    }
  }

  function handleSelectField(fieldId: string) {
    setSelectedFieldId((prev) => (prev === fieldId ? null : fieldId));
  }

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
  }

  function handleDeleteRow(rowId: string) {
    const row = rows.find((r) => r.id === rowId);
    if (row && selectedFieldId && row.fields.some((f) => f.id === selectedFieldId)) {
      setSelectedFieldId(null);
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  function handleFieldChange(updated: FormField) {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        fields: row.fields.map((f) => (f.id === updated.id ? updated : f)),
      })),
    );
  }

  function handleSave() {
    setSaveStatus("idle");
    saveMutation.mutate(
      { rows },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 3000);
        },
        onError: () => {
          setSaveStatus("error");
        },
      },
    );
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
            className="h-9 px-4 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? messages.common.saving : m.save}
          </button>
        </div>
      </PageHeader>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
              onDeleteRow={handleDeleteRow}
            />
          </div>

          {/* Config panel — only shown when a field is selected */}
          {selectedField !== null && (
            <div className="shrink-0 w-72">
              <FieldConfigPanel field={selectedField} onChange={handleFieldChange} />
            </div>
          )}
        </div>
      </DndContext>
    </div>
  );
}
