import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { GearIcon, HandTapIcon, QuestionIcon } from "@phosphor-icons/react";
import { useEffect, useReducer, useState } from "react";
import { useNavigate, useParams } from "react-router";

import type {
  FieldOptionsSource,
  FieldType,
  FormField,
  FormRow,
  SubmissionConfig,
} from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { ToggleSwitch } from "@lmaa/ui/toggle-switch";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { ExportActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardIconButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { FlowConnector } from "@/components/ui/FlowConnector.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useDashboardSortableSensors } from "@/components/ui/useDashboardSortableSensors.ts";
import { useI18n } from "@/context/I18nContext.tsx";
import { BuilderCanvas } from "@/features/templates/form-builder/BuilderCanvas.tsx";
import { fieldTypeLabel } from "@/features/templates/form-builder/field-type-label.ts";
import { FieldConfigPanel } from "@/features/templates/form-builder/FieldConfigPanel.tsx";
import { FieldTypeIcon } from "@/features/templates/form-builder/FieldPalette.tsx";
import { FieldPalette } from "@/features/templates/form-builder/FieldPalette.tsx";
import { SubmissionConfigPanel } from "@/features/templates/form-builder/SubmissionConfigPanel.tsx";
import { TextTokensHelp } from "@/features/templates/form-builder/TextTokensHelp.tsx";
import { exportFormConfigSingle } from "@/features/templates/hooks/formConfigExport.ts";
import {
  useFormConfig,
  useSaveFormConfig,
  useSetFormConfigActive,
} from "@/features/templates/hooks/useFormConfig.ts";

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

type BuilderActiveDrag = {
  id: string;
  field?: FormField;
  row?: FormRow;
  paletteType?: FieldType;
} | null;

interface FormBuilderFormState {
  rows: FormRow[];
  slug: string;
  submissionConfig: SubmissionConfig | undefined;
  isDirty: boolean;
}

interface BuilderUIState {
  selectedFieldId: string | null;
  saveStatus: "idle" | "saved" | "error" | "slug_conflict";
  showExportWarning: boolean;
  activeDrag: BuilderActiveDrag;
}

const FIELD_CONFIG_EXCLUDED_TYPES = new Set<FieldType>([
  "button",
  "richtext",
  "headline",
  "separator",
  "paragraph",
]);

const SUBMISSION_CONFIG_EXCLUDED_TYPES = new Set<FieldType>([
  "button",
  "headline",
  "separator",
  "paragraph",
]);

function getFieldOptions(
  rows: FormRow[],
  excludedTypes: ReadonlySet<FieldType>,
  excludedFieldId?: string,
  useNameAsId = false,
) {
  const options: Array<{ id: string; label: string }> = [];

  for (const row of rows) {
    for (const field of row.fields) {
      if (field.id === excludedFieldId || excludedTypes.has(field.type)) continue;
      options.push({
        id: useNameAsId ? field.name || field.id : field.id,
        label: field.label || field.name || field.id,
      });
    }
  }

  return options;
}

function removeFieldFromRows(rows: FormRow[], rowId: string, fieldId: string) {
  const nextRows: FormRow[] = [];

  for (const row of rows) {
    if (row.id !== rowId) {
      nextRows.push(row);
      continue;
    }

    const fields = row.fields.filter((field) => field.id !== fieldId);
    if (fields.length > 0) nextRows.push({ ...row, fields });
  }

  return nextRows;
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

  const [formState, setFormState] = useState<FormBuilderFormState>({
    rows: [],
    slug: "",
    submissionConfig: undefined,
    isDirty: false,
  });
  const [uiState, dispatchUI] = useReducer(
    (prev: BuilderUIState, action: Partial<BuilderUIState>): BuilderUIState => ({
      ...prev,
      ...action,
    }),
    { selectedFieldId: null, saveStatus: "idle", showExportWarning: false, activeDrag: null },
  );
  const { selectedFieldId, saveStatus, showExportWarning, activeDrag } = uiState;

  const [helpOpen, setHelpOpen] = useState(false);

  const { rows, slug, submissionConfig, isDirty } = formState;

  const setRows = (updater: FormRow[] | ((prev: FormRow[]) => FormRow[])) => {
    setFormState((prev) => ({
      ...prev,
      rows: typeof updater === "function" ? updater(prev.rows) : updater,
    }));
  };

  const setSlug = (value: string) => {
    setFormState((prev) => ({ ...prev, slug: value }));
  };

  const setSubmissionConfig = (value: SubmissionConfig | undefined) => {
    setFormState((prev) => ({ ...prev, submissionConfig: value }));
  };

  const setIsDirty = (value: boolean) => {
    setFormState((prev) => ({ ...prev, isDirty: value }));
  };

  // Sync server state into local rows, slug and submissionConfig once loaded
  useEffect(() => {
    if (config !== undefined) {
      setFormState({
        rows: config?.rows ?? [],
        slug: config?.slug ?? formName,
        submissionConfig: config?.submissionConfig,
        isDirty: false,
      });
    }
  }, [config, formName]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dispatchUI({ selectedFieldId: null });
        (document.activeElement as HTMLElement)?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedField =
    selectedFieldId !== null
      ? (rows.flatMap((r) => r.fields).find((f) => f.id === selectedFieldId) ?? null)
      : null;

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);

    if (id.startsWith("palette:")) {
      const { type } = resolvePaletteId(id.replace("palette:", ""), m.fieldTypes);
      dispatchUI({ activeDrag: { id, paletteType: type } });
      return;
    }

    if (id.startsWith("field:")) {
      const [, rowId, fieldId] = id.split(":");
      const row = rows.find((r) => r.id === rowId);
      const field = row?.fields.find((f) => f.id === fieldId);
      dispatchUI({ activeDrag: { id, field } });
      return;
    }

    const row = rows.find((r) => r.id === id);
    dispatchUI({ activeDrag: { id, row } });
  }

  function handleDragEnd(event: DragEndEvent) {
    dispatchUI({ activeDrag: null });
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
          dispatchUI({ selectedFieldId: newField.id });
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
      dispatchUI({ selectedFieldId: newField.id });
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
    dispatchUI({ selectedFieldId: selectedFieldId === fieldId ? null : fieldId });
  }

  function handleDeleteField(rowId: string, fieldId: string) {
    if (selectedFieldId === fieldId) dispatchUI({ selectedFieldId: null });
    setRows((prev) => removeFieldFromRows(prev, rowId, fieldId));
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
    dispatchUI({ saveStatus: "idle" });
    saveMutation.mutate(
      { rows, slug: slug || undefined, submissionConfig },
      {
        onSuccess: () => {
          dispatchUI({ saveStatus: "saved" });
          setIsDirty(false);
          setTimeout(() => dispatchUI({ saveStatus: "idle" }), 3000);
        },
        onError: (err: unknown) => {
          const status =
            err && typeof err === "object" && "status" in err
              ? (err as { status: number }).status
              : 0;
          if (status === 409) {
            dispatchUI({ saveStatus: "slug_conflict" });
          } else {
            dispatchUI({ saveStatus: "error" });
          }
        },
      },
    );
  }

  function handleExport() {
    if (!config) return;
    if (isDirty) {
      dispatchUI({ showExportWarning: true });
      setTimeout(() => dispatchUI({ showExportWarning: false }), 3000);
      return;
    }
    exportFormConfigSingle(config.name, slug, rows, submissionConfig);
  }

  if (isLoading) {
    return (
      <BuilderLoadingPage
        title={m.title}
        backLabel={m.listTitle}
        onBack={() => navigate("/forms")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={`${m.title}: ${formName}`}
        leading={<HeaderBackButton label={m.listTitle} onClick={() => navigate("/forms")} />}
      >
        <BuilderHeaderActions
          showExportWarning={showExportWarning}
          saveStatus={saveStatus}
          isSaving={saveMutation.isPending}
          hasConfig={!!config}
          onExport={handleExport}
          onSave={handleSave}
          onOpenHelp={() => setHelpOpen(true)}
          m={m}
          savingLabel={messages.common.saving}
        />
      </PageHeader>

      <BuilderSlugBar
        slug={slug}
        isActive={config?.isActive}
        isSavingActive={setActive.isPending}
        onSlugChange={setSlug}
        onActiveChange={(checked) => setActive.mutate({ name: formName, isActive: checked })}
        m={m}
      />

      <BuilderWorkspace
        rows={rows}
        selectedField={selectedField}
        selectedFieldId={selectedFieldId}
        activeDrag={activeDrag}
        fieldTypes={m.fieldTypes}
        preferencesTitle={m.preferencesTitle}
        noFieldSelectedTitle={messages.formBuilder.noFieldSelected}
        noFieldSelectedHint={messages.formBuilder.noFieldSelectedHint}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => dispatchUI({ activeDrag: null })}
        onSelectField={handleSelectField}
        onDeleteField={handleDeleteField}
        onFieldChange={handleFieldChange}
      />

      <FlowConnector />

      <BuilderSubmissionConfigPanel
        config={submissionConfig}
        onChange={setSubmissionConfig}
        rows={rows}
      />

      <TextTokensHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BuilderLoadingPage({
  title,
  backLabel,
  onBack,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div>
      <PageHeader title={title} leading={<HeaderBackButton label={backLabel} onClick={onBack} />} />
      <div className="flex items-center justify-center py-24">
        <div className="size-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

interface BuilderSlugBarProps {
  slug: string;
  isActive: boolean | undefined;
  isSavingActive: boolean;
  onSlugChange: (value: string) => void;
  onActiveChange: (checked: boolean) => void;
  m: ReturnType<typeof useI18n>["messages"]["formBuilder"];
}

function BuilderSlugBar({
  slug,
  isActive,
  isSavingActive,
  onSlugChange,
  onActiveChange,
  m,
}: BuilderSlugBarProps) {
  return (
    <div className="pb-3 flex items-center gap-3">
      <label htmlFor="form-slug" className="text-sm text-[var(--ds-text-muted)] shrink-0">
        {m.slugLabel}:
      </label>
      <div className="flex items-center gap-1">
        <span className="text-sm text-[var(--ds-text-muted)] font-mono">/</span>
        <div className="w-48">
          <DashboardInput
            id="form-slug"
            type="text"
            value={slug}
            onChange={(event) =>
              onSlugChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            placeholder={m.slugPlaceholder}
            className="font-mono"
          />
        </div>
      </div>
      {isActive !== undefined && (
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="form-active-toggle" className="text-sm text-[var(--ds-text-muted)]">
            {m.status.active}
          </label>
          <ToggleSwitch checked={isActive} onChange={onActiveChange} disabled={isSavingActive} />
        </div>
      )}
    </div>
  );
}

interface BuilderWorkspaceProps {
  rows: FormRow[];
  selectedField: FormField | null;
  selectedFieldId: string | null;
  activeDrag: BuilderActiveDrag;
  fieldTypes: Record<string, string>;
  preferencesTitle: string;
  noFieldSelectedTitle: string;
  noFieldSelectedHint: string;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  onSelectField: (fieldId: string) => void;
  onDeleteField: (rowId: string, fieldId: string) => void;
  onFieldChange: (field: FormField) => void;
}

function BuilderWorkspace({
  rows,
  selectedField,
  selectedFieldId,
  activeDrag,
  fieldTypes,
  preferencesTitle,
  noFieldSelectedTitle,
  noFieldSelectedHint,
  onDragStart,
  onDragEnd,
  onDragCancel,
  onSelectField,
  onDeleteField,
  onFieldChange,
}: BuilderWorkspaceProps) {
  const sensors = useDashboardSortableSensors({ activationDistance: 6 });

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="flex gap-4 items-start">
          <div className="shrink-0">
            <FieldPalette />
          </div>

          <div className="flex-1 min-w-0">
            <BuilderCanvas
              rows={rows}
              selectedFieldId={selectedFieldId}
              onSelectField={onSelectField}
              onDeleteField={onDeleteField}
            />
          </div>

          <div className="shrink-0 w-72">
            <DashboardSection>
              <DashboardSection.Header
                icon={
                  selectedField !== null ? (
                    <FieldTypeIcon type={selectedField.type} />
                  ) : (
                    <GearIcon weight="duotone" className="size-4" />
                  )
                }
                title={
                  selectedField !== null
                    ? fieldTypeLabel(
                        selectedField.type,
                        fieldTypes as unknown as Record<string, string>,
                      )
                    : preferencesTitle
                }
              />
              {selectedField !== null ? (
                <DashboardSection.Body>
                  <FieldConfigPanel
                    field={selectedField}
                    onChange={onFieldChange}
                    allFields={getFieldOptions(rows, FIELD_CONFIG_EXCLUDED_TYPES, selectedField.id)}
                  />
                </DashboardSection.Body>
              ) : (
                <ContentUnavailableView
                  className="h-64"
                  icon={<HandTapIcon weight="duotone" aria-hidden />}
                  title={noFieldSelectedTitle}
                  subtitle={noFieldSelectedHint}
                />
              )}
            </DashboardSection>
          </div>
        </div>

        <DragOverlay>
          <BuilderDragOverlayContent activeDrag={activeDrag} fieldTypes={fieldTypes} />
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function BuilderSubmissionConfigPanel({
  config,
  onChange,
  rows,
}: {
  config: SubmissionConfig | undefined;
  onChange: (config: SubmissionConfig | undefined) => void;
  rows: FormRow[];
}) {
  return (
    <SubmissionConfigPanel
      config={config}
      onChange={onChange}
      fields={getFieldOptions(rows, SUBMISSION_CONFIG_EXCLUDED_TYPES, undefined, true)}
    />
  );
}

interface BuilderHeaderActionsProps {
  showExportWarning: boolean;
  saveStatus: "idle" | "saved" | "error" | "slug_conflict";
  isSaving: boolean;
  hasConfig: boolean;
  onExport: () => void;
  onSave: () => void;
  onOpenHelp: () => void;
  m: ReturnType<typeof useI18n>["messages"]["formBuilder"];
  savingLabel: string;
}

function BuilderHeaderActions({
  showExportWarning,
  saveStatus,
  isSaving,
  hasConfig,
  onExport,
  onSave,
  onOpenHelp,
  m,
  savingLabel,
}: BuilderHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3">
      {showExportWarning && (
        <span className="text-sm text-amber-600 font-medium">{m.exportUnsavedWarning}</span>
      )}
      <DashboardIconButton
        onClick={onOpenHelp}
        title={m.textTokensHelp.open}
        aria-label={m.textTokensHelp.open}
      >
        <QuestionIcon weight="duotone" className="size-4" />
      </DashboardIconButton>
      <ExportActionButton
        onClick={onExport}
        disabled={!hasConfig}
        label={m.exportForm}
        variant="neutral"
      />
      {saveStatus === "saved" && (
        <span className="text-sm text-green-600 font-medium">{m.saved}</span>
      )}
      {saveStatus === "error" && (
        <span className="text-sm text-red-600 font-medium">{m.saveError}</span>
      )}
      {saveStatus === "slug_conflict" && (
        <span className="text-sm text-red-600 font-medium">{m.slugConflict}</span>
      )}
      <SaveActionButton
        onClick={onSave}
        disabled={isSaving}
        busy={isSaving}
        label={isSaving ? savingLabel : m.save}
      />
    </div>
  );
}

function BuilderDragOverlayContent({
  activeDrag,
  fieldTypes,
}: {
  activeDrag: {
    id: string;
    field?: FormField;
    row?: FormRow;
    paletteType?: FieldType;
  } | null;
  fieldTypes: Record<string, string>;
}) {
  if (!activeDrag) return null;

  if (activeDrag.field) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-sm shadow-xl ring-1 ring-[var(--color-primary)]/30 cursor-grabbing">
        <span className="flex-1 min-w-0 truncate font-medium text-[var(--ds-text)]">
          {activeDrag.field.label}
        </span>
        <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--ds-color-neutral-400)] text-[var(--ds-color-neutral-400)]">
          {activeDrag.field.type.slice(0, 3)}
        </span>
      </div>
    );
  }

  if (activeDrag.row) {
    return (
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
    );
  }

  if (activeDrag.paletteType) {
    return (
      <div className="px-3 py-2 rounded-control border border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-sm font-medium text-[var(--ds-text)] shadow-xl cursor-grabbing">
        {defaultFieldLabel(activeDrag.paletteType, fieldTypes)}
      </div>
    );
  }

  return null;
}
