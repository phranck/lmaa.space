import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { BuilderCanvas } from "@/features/form-builder/BuilderCanvas.tsx";
import { FieldConfigPanel } from "@/features/form-builder/FieldConfigPanel.tsx";
import { FieldPalette } from "@/features/form-builder/FieldPalette.tsx";
import { SubmissionConfigPanel } from "@/features/form-builder/SubmissionConfigPanel.tsx";
import { useFormConfig, useSaveFormConfig } from "@/features/form-builder/hooks/useFormConfig.ts";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type {
  FieldOptionsSource,
  FieldType,
  FormField,
  FormRow,
  SubmissionConfig,
} from "@lmaa/contracts";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { SFHandTap } from "sf-symbols-lib/monochrome";

/**
 * Returns the default human-readable label for a given field type.
 *
 * @param type       - The field type.
 * @param fieldTypes - Localized fieldType labels from i18n messages.
 * @returns The display label used when a new field is created.
 */
function defaultFieldLabel(type: FieldType, fieldTypes: Record<string, string>): string {
  return fieldTypes[type] ?? type;
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
 * @param type       - The field type to create.
 * @param fieldTypes - Localized fieldType labels from i18n messages.
 * @param span       - Column span in the 12-column grid. Defaults to 12 (full width).
 * @returns A ready-to-use FormField instance.
 */
function makeNewField(type: FieldType, fieldTypes: Record<string, string>, span = 12): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label: defaultFieldLabel(type, fieldTypes),
    required: false,
    span,
  };
}

/**
 * Resolves a palette drag ID to a field type, label and optional optionsSource.
 * Special IDs like "categories-select" and "regions-select" map to multi-select
 * fields with a preset optionsSource.
 *
 * @param paletteId  - The palette drag ID.
 * @param fieldTypes - Localized fieldType labels from i18n messages.
 */
function resolvePaletteId(
  paletteId: string,
  fieldTypes: Record<string, string>,
): {
  type: FieldType;
  label: string;
  optionsSource?: FieldOptionsSource;
} {
  if (paletteId === "categories-select") {
    return {
      type: "multi-select",
      label: fieldTypes.categoriesSelect ?? "Kategorien",
      optionsSource: "categories",
    };
  }
  if (paletteId === "regions-select") {
    return {
      type: "multi-select",
      label: fieldTypes.regionsSelect ?? "Regionen",
      optionsSource: "regions",
    };
  }
  const type = paletteId as FieldType;
  return { type, label: defaultFieldLabel(type, fieldTypes) };
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
 * Form builder edit page — loads a form by name from the URL parameter.
 *
 * Supports drag-from-palette, row reordering, field config panel, and slug editing.
 *
 * @returns Full-page form builder UI.
 */
export function FormBuilderEditPage() {
  const { name } = useParams<{ name: string }>();
  const formName = name ?? "";

  const { messages } = useI18n();
  const m = messages.formBuilder;

  const { data: config, isLoading } = useFormConfig(formName);
  const saveMutation = useSaveFormConfig(formName);

  const [rows, setRows] = useState<FormRow[]>([]);
  const [slug, setSlug] = useState<string>("");
  const [submissionConfig, setSubmissionConfig] = useState<SubmissionConfig | undefined>();
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error" | "slug_conflict">(
    "idle",
  );
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    field?: FormField;
    row?: FormRow;
    paletteType?: FieldType;
  } | null>(null);

  // Sync server state into local rows, slug and submissionConfig once loaded
  useEffect(() => {
    if (config !== undefined) {
      setRows(config?.rows ?? []);
      setSlug(config?.slug ?? formName);
      setSubmissionConfig(config?.submissionConfig);
    }
  }, [config, formName]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedFieldId(null);
        (document.activeElement as HTMLElement)?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selectedField =
    selectedFieldId !== null
      ? (rows.flatMap((r) => r.fields).find((f) => f.id === selectedFieldId) ?? null)
      : null;

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);

    if (id.startsWith("palette:")) {
      const { type } = resolvePaletteId(id.replace("palette:", ""), m.fieldTypes);
      setActiveDrag({ id, paletteType: type });
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
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);

    if (activeId.startsWith("palette:")) {
      const { type, label, optionsSource } = resolvePaletteId(
        activeId.replace("palette:", ""),
        m.fieldTypes,
      );
      const overId = String(over.id);

      // Resolve drop target: row ID directly, free-span droppable, or neighbouring field
      const targetRowId = overId.startsWith("field:")
        ? overId.split(":")[1]
        : overId.startsWith("free:")
          ? overId.split(":")[1]
          : overId;
      const targetRow = rows.find((r) => r.id === targetRowId);
      if (targetRow) {
        const free = rowFreeSpan(targetRow);
        if (free > 0) {
          const newField = {
            ...makeNewField(type, m.fieldTypes, free),
            label,
            ...(optionsSource && { optionsSource }),
          };
          setRows((prev) =>
            prev.map((r) =>
              r.id === targetRow.id ? { ...r, fields: [...r.fields, newField] } : r,
            ),
          );
          setSelectedFieldId(newField.id);
          return;
        }
      }

      const newField = {
        ...makeNewField(type, m.fieldTypes),
        label,
        ...(optionsSource && { optionsSource }),
      };
      const newRow = makeNewRow(newField);
      setRows((prev) => [...prev, newRow]);
      setSelectedFieldId(newField.id);
      return;
    }

    const overId = String(over.id);
    if (!activeId.startsWith("field:") && !overId.startsWith("field:")) {
      const oldIndex = rows.findIndex((r) => r.id === activeId);
      const newIndex = rows.findIndex((r) => r.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setRows((prev) => arrayMove(prev, oldIndex, newIndex));
      }
      return;
    }

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
      { rows, slug: slug || undefined, submissionConfig },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 3000);
        },
        onError: (err: unknown) => {
          const status =
            err && typeof err === "object" && "status" in err
              ? (err as { status: number }).status
              : 0;
          if (status === 409) {
            setSaveStatus("slug_conflict");
          } else {
            setSaveStatus("error");
          }
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
      <PageHeader title={`${m.title}: ${formName}`}>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && (
            <span className="text-sm text-green-600 font-medium">{m.saved}</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-600 font-medium">{m.saveError}</span>
          )}
          {saveStatus === "slug_conflict" && (
            <span className="text-sm text-red-600 font-medium">{m.slugConflict}</span>
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

      {/* Slug editor */}
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <Link
          to="/formular"
          className="text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
        >
          {m.backToList}
        </Link>
        <span className="text-[var(--ds-border)]">·</span>
        <label htmlFor="form-slug" className="text-sm text-[var(--ds-text-muted)] shrink-0">
          {m.slugLabel}:
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-[var(--ds-text-muted)] font-mono">/</span>
          <input
            id="form-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder={m.slugPlaceholder}
            className="w-48 px-2 py-1 text-sm font-mono bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      <div className="pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDrag(null)}
        >
          <div className="flex gap-4 items-start">
            <div className="shrink-0">
              <FieldPalette />
            </div>

            <div className="flex-1 min-w-0">
              <BuilderCanvas
                rows={rows}
                selectedFieldId={selectedFieldId}
                onSelectField={handleSelectField}
                onDeleteField={handleDeleteField}
              />
            </div>

            <div className="shrink-0 w-72">
              {selectedField !== null ? (
                <FieldConfigPanel
                  field={selectedField}
                  onChange={handleFieldChange}
                  allFields={rows
                    .flatMap((r) => r.fields)
                    .filter(
                      (f) =>
                        f.id !== selectedField.id &&
                        f.type !== "button" &&
                        f.type !== "richtext" &&
                        f.type !== "headline" &&
                        f.type !== "separator" &&
                        f.type !== "paragraph",
                    )
                    .map((f) => ({ id: f.id, label: f.label || f.name || f.id }))}
                />
              ) : (
                <div className="bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-card min-w-64">
                  <ContentUnavailableView
                    className="h-64"
                    icon={<SFHandTap aria-hidden />}
                    title={messages.formBuilder.noFieldSelected}
                    subtitle={messages.formBuilder.noFieldSelectedHint}
                  />
                </div>
              )}
            </div>
          </div>

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

      <SubmissionConfigPanel
        config={submissionConfig}
        onChange={setSubmissionConfig}
        fields={rows
          .flatMap((r) => r.fields)
          .filter((f) => f.type === "email")
          .map((f) => ({ id: f.id, label: f.label || f.name || f.id }))}
      />
    </div>
  );
}
