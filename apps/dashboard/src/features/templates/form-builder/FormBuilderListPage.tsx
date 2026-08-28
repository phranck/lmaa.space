import {
  CheckCircleIcon,
  CircleIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  PlusCircleIcon,
  TrashIcon,
  UploadIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import type { FormConfig } from "@lmaa/contracts";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  CloseActionButton,
  CreateActionButton,
  ExportActionButton,
  ImportActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import type { ColumnDef } from "@/components/ui/Table.tsx";
import { DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { ImportConflictDialog } from "@/features/templates/form-builder/ImportConflictDialog.tsx";
import {
  exportFormConfigAll,
  exportFormConfigSingle,
} from "@/features/templates/hooks/formConfigExport.ts";
import {
  useCreateFormConfig,
  useDeleteFormConfig,
  useFormConfigs,
  useImportFormConfig,
  useSetFormConfigActive,
} from "@/features/templates/hooks/useFormConfig.ts";
import { useImportQueue } from "@/lib/hooks/useImportQueue.ts";

type ImportFormData = {
  name: string;
  slug?: string;
  rows: FormConfig["rows"];
  submissionConfig?: FormConfig["submissionConfig"];
};

/**
 * Derives a slug from a name: lowercase, replace spaces/underscores with hyphens,
 * remove all characters that aren't alphanumeric or hyphens.
 */
function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ActiveBadge({
  isActive,
  activeLabel,
  inactiveLabel,
}: {
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <CheckCircleIcon weight="duotone" className="size-3.5" />
        {activeLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-text-muted)]">
      <CircleIcon weight="duotone" className="size-3.5" />
      {inactiveLabel}
    </span>
  );
}

/**
 * Dialog for creating a new form configuration.
 */
function NewFormDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const { messages } = useI18n();
  const m = messages.formBuilder;
  const createMutation = useCreateFormConfig();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const slugEditedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.getElementById("new-form-name")?.focus();
  }, []);

  function handleNameChange(value: string) {
    const nextName = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setName(nextName);
    if (!slugEditedRef.current) {
      setSlug(deriveSlug(nextName));
    }
  }

  function handleSlugChange(value: string) {
    slugEditedRef.current = true;
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setError(null);

    createMutation.mutate(
      { name: name.trim(), slug: slug.trim() },
      {
        onSuccess: () => {
          onCreated(name.trim());
        },
        onError: (err: unknown) => {
          const status =
            err && typeof err === "object" && "status" in err
              ? (err as { status: number }).status
              : 0;
          if (status === 409) {
            const msg =
              err && typeof err === "object" && "responseMessage" in err
                ? String((err as { responseMessage: string }).responseMessage)
                : "";
            if (msg.toLowerCase().includes("slug")) {
              setError(m.slugConflict);
            } else {
              setError(m.nameConflict);
            }
          } else {
            setError(messages.common.unknownError);
          }
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      title={m.newForm}
      titleIcon={<PlusCircleIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onClose}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-3 space-y-4">
          <div>
            <label
              htmlFor="new-form-name"
              className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
            >
              {m.formNameLabel}
            </label>
            <DashboardInput
              id="new-form-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="suggestion-form"
              className="font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="new-form-slug"
              className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
            >
              {m.formSlugLabel}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ds-text-muted)] shrink-0">/</span>
              <DashboardInput
                id="new-form-slug"
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder={m.slugPlaceholder}
                className="min-w-0 flex-1 font-mono"
              />
            </div>
            <p className="text-xs text-[var(--ds-text-muted)] mt-1">{m.formSlugHint}</p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <Dialog.Footer>
          <CancelActionButton label={messages.common.cancel} onClick={onClose} />
          <CreateActionButton
            disabled={createMutation.isPending || !slug || !name}
            label={createMutation.isPending ? messages.common.saving : m.create}
            type="submit"
          />
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}

/**
 * Form builder list page showing all form configurations.
 *
 * @returns List page with DataTable of forms and "New Form" button.
 */
export function FormBuilderListPage() {
  const { messages } = useI18n();
  const m = messages.formBuilder;
  const common = messages.common;
  const navigate = useNavigate();
  const { data: forms = [], isLoading } = useFormConfigs();
  const deleteForm = useDeleteFormConfig();
  const importForm = useImportFormConfig();
  const setActive = useSetFormConfigActive();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const importQueue = useImportQueue<ImportFormData>({
    mutate: (data, cbs) => importForm.mutate(data, cbs),
    messages: { importSuccess: m.importSuccess, importError: m.importError },
  });

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteForm.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  function handleCreated(name: string) {
    setShowDialog(false);
    void navigate(`/forms/${name}`);
  }

  function handleExportAll() {
    exportFormConfigAll(forms);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        let queue: ImportFormData[];

        if (Array.isArray(json.forms)) {
          queue = json.forms as ImportFormData[];
        } else if (typeof json.name === "string" && Array.isArray(json.rows)) {
          queue = [
            {
              name: json.name,
              slug: typeof json.slug === "string" ? json.slug : undefined,
              rows: json.rows as FormConfig["rows"],
              submissionConfig: json.submissionConfig as FormConfig["submissionConfig"],
            },
          ];
        } else {
          importQueue.setAlertMessage(m.importInvalidFile);
          return;
        }

        importQueue.processQueue(queue, 0);
      } catch {
        importQueue.setAlertMessage(m.importInvalidFile);
      }
    };
    reader.readAsText(file);
  }

  const columns = useMemo<ColumnDef<FormConfig>[]>(
    () => [
      {
        id: "name",
        header: m.tableColumns.name,
        sortKey: (form) => form.name.toLowerCase(),
        cell: (form) => (
          <button
            type="button"
            onClick={() => navigate(`/forms/${form.name}`)}
            className="font-medium text-[var(--ds-text)] hover:underline text-left truncate font-mono"
          >
            {form.name}
          </button>
        ),
      },
      {
        id: "slug",
        header: m.slugLabel,
        cell: (form) => (
          <span className="font-mono text-xs text-[var(--ds-text-muted)]">
            {form.slug ? `/${form.slug}` : "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: m.tableColumns.status,
        cell: (form) => (
          <button
            type="button"
            title={form.isActive ? m.status.deactivate : m.status.activate}
            disabled={setActive.isPending}
            onClick={() => setActive.mutate({ name: form.name, isActive: !form.isActive })}
            className="disabled:opacity-40 transition-opacity"
          >
            <ActiveBadge
              isActive={form.isActive}
              activeLabel={m.status.active}
              inactiveLabel={m.status.inactive}
            />
          </button>
        ),
      },
      {
        id: "actions",
        className: "w-[28rem]",
        cell: (form) => (
          <div className="flex items-center justify-end gap-2">
            <TableActionButton
              onClick={() =>
                exportFormConfigSingle(
                  form.name,
                  form.slug ?? undefined,
                  form.rows,
                  form.submissionConfig,
                )
              }
              icon={<UploadIcon weight="duotone" className="size-3.5" />}
              label={m.exportForm}
            />
            <TableActionButton
              onClick={() => navigate(`/forms/${form.name}`)}
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              label={m.editButton}
            />
            <TableActionButton
              variant="danger"
              onClick={() => setDeleteTarget(form.name)}
              disabled={deleteForm.isPending}
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
              label={common.delete}
            />
          </div>
        ),
      },
    ],
    [m, common, navigate, deleteForm.isPending, setActive.isPending, setActive.mutate],
  );

  return (
    <PageLayout>
      <PageHeader title={m.listTitle}>
        <ImportActionButton
          onClick={() => fileInputRef.current?.click()}
          label={m.importForm}
          variant="neutral"
        />
        <ExportActionButton
          onClick={handleExportAll}
          disabled={forms.length === 0}
          label={m.exportAll}
          variant="neutral"
        />
        <CreateActionButton onClick={() => setShowDialog(true)} label={m.newForm} />
      </PageHeader>

      <PageBody>
        {isLoading && (
          <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
            {common.loading}
          </div>
        )}

        {!isLoading && forms.length === 0 && (
          <ContentUnavailableView
            chromeless
            className="flex-1 min-h-0"
            icon={<FileIcon weight="duotone" aria-hidden />}
            title={m.noForms}
            subtitle={m.noFormsHint}
          />
        )}

        {!isLoading && forms.length > 0 && (
          <div className="-mx-3 -mt-3">
            <DataTable columns={columns} data={forms} getRowKey={(form) => form.id} stickyHeader />
          </div>
        )}
      </PageBody>

      {/* Hidden file input for import */}
      <input
        aria-label={m.importForm}
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <NewFormDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onCreated={handleCreated}
      />

      {importQueue.conflict && (
        <ImportConflictDialog
          formName={importQueue.conflict.item.name}
          onOverwrite={importQueue.handleConflictOverwrite}
          onRename={importQueue.handleConflictRename}
          onCancel={importQueue.handleConflictSkip}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={`${m.deleteConfirmPrefix}${deleteTarget}${m.deleteConfirmSuffix}`}
        description={m.deleteConfirmDescription}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={deleteForm.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* Import alert dialog */}
      <Dialog
        open={importQueue.alertMessage !== null}
        title={importQueue.alertMessage ?? ""}
        titleIcon={<DownloadIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => importQueue.setAlertMessage(null)}
      >
        <Dialog.Footer>
          <CloseActionButton
            iconOnly={false}
            label={common.close}
            onClick={() => importQueue.setAlertMessage(null)}
            variant="neutral"
          />
        </Dialog.Footer>
      </Dialog>
    </PageLayout>
  );
}
