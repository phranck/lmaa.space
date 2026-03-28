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
import {
  DownloadIcon,
  HandTapIcon,
  UploadIcon,
} from "@phosphor-icons/react";
import { ToggleSwitch } from "@lmaa/ui";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import type {
  FieldOptionsSource,
  FieldType,
  FormField,
  FormRow,
  SubmissionConfig,
} from "@lmaa/contracts";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { FlowConnector } from "@/components/ui/FlowConnector.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { BuilderCanvas } from "@/features/templates/form-builder/BuilderCanvas.tsx";
import { FieldConfigPanel } from "@/features/templates/form-builder/FieldConfigPanel.tsx";
import { FieldPalette } from "@/features/templates/form-builder/FieldPalette.tsx";
import { SubmissionConfigPanel } from "@/features/templates/form-builder/SubmissionConfigPanel.tsx";
import { exportFormConfigSingle } from "@/features/templates/hooks/formConfigExport.ts";
import {
  useFormConfig,
  useSaveFormConfig,
  useSetFormConfigActive,
} from "@/features/templates/hooks/useFormConfig.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

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
      label: fieldTypes.regionsSelect ?? "Versand-Regionen",
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
  const navigate = useNavigate();

  const { messages } = useI18n();
  const m = messages.formBuilder;

  const { data: config, isLoading } = useFormConfig(formName);
  const saveMutation = useSaveFormConfig(formName);
  const setActive = useSetFormConfigActive();

  const [rows, setRows] = useState<FormRow[]>([]);
  const [slug, setSlug] = useState<string>("");
  const [submissionConfig, setSubmissionConfig] = useState<SubmissionConfig | undefined>();
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error" | "slug_conflict">(
    "idle",
  );
  const [isDirty, setIsDirty] = useState(false);
  const [showExportWarning, setShowExportWarning] = useState(false);
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
      setIsDirty(false);
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
    setIsDirty(true);
  }

  function handleFieldChange(updated: FormField) {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        fields: row.fields.map((f) => (f.id === updated.id ? updated : f)),
      })),
    );
    setIsDirty(true);
  }

  function handleSave() {
    setSaveStatus("idle");
    saveMutation.mutate(
      { rows, slug: slug || undefined, submissionConfig },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          setIsDirty(false);
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

  useKeyboardSave(handleSave, !isLoading && !saveMutation.isPending);

  function handleExport() {
    if (!config) return;
    if (isDirty) {
      setShowExportWarning(true);
      setTimeout(() => setShowExportWarning(false), 3000);
      return;
    }
    exportFormConfigSingle(config.name, slug, rows, submissionConfig);
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title={m.title}
          leading={<HeaderBackButton label={m.listTitle} onClick={() => navigate("/forms")} />}
        />
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${m.title}: ${formName}`}
        leading={<HeaderBackButton label={m.listTitle} onClick={() => navigate("/forms")} />}
      >
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
            <UploadIcon weight="duotone" className="w-3.5 h-3.5" />
            {m.exportForm}
          </button>
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
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-50 transition-colors"
          >
            <DownloadIcon weight="duotone" className="w-3.5 h-3.5" />
            {saveMutation.isPending ? messages.common.saving : m.save}
          </button>
        </div>
      </PageHeader>

      {/* Slug editor */}
      <div className="pb-3 flex items-center gap-3">
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
        {config && (
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="form-active-toggle" className="text-sm text-[var(--ds-text-muted)]">
              {m.status.active}
            </label>
            <ToggleSwitch
              checked={config.isActive}
              onChange={(checked) => setActive.mutate({ name: formName, isActive: checked })}
              disabled={setActive.isPending}
            />
          </div>
        )}
      </div>

      <div>
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
                    icon={<HandTapIcon weight="duotone" aria-hidden />}
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
                <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--ds-color-neutral-400)] text-[var(--ds-color-neutral-400)]">
                  {activeDrag.field.type.slice(0, 3)}
                </span>
              </div>
            )}
            {activeDrag?.row && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] text-sm shadow-xl cursor-grabbing">
                {activeDrag.row.fields.map((f) => (
                  <span
                    key={f.id}
                    className="px-2 py-0.5 rounded bg-[var(--ds-color-neutral-400)] text-xs text-[var(--ds-text)] truncate max-w-32"
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            )}
            {activeDrag?.paletteType && (
              <div className="px-3 py-2 rounded-control border border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-sm font-medium text-[var(--ds-text)] shadow-xl cursor-grabbing">
                {defaultFieldLabel(activeDrag.paletteType, m.fieldTypes)}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <FlowConnector />

      <SubmissionConfigPanel
        config={submissionConfig}
        onChange={setSubmissionConfig}
        fields={rows
          .flatMap((r) => r.fields)
          .filter((f) => !["button", "headline", "separator", "paragraph"].includes(f.type))
          .map((f) => ({ id: f.name || f.id, label: f.label || f.name || f.id }))}
      />
    </div>
  );
}
