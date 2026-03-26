import {
  DownloadIcon,
  EnvelopeOpenIcon,
  FileTextIcon,
  LockIcon,
  PlusCircleIcon,
  TrashIcon,
  UploadIcon,
} from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import type { EmailTemplate, EmailTemplateInput } from "@lmaa/contracts";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import type { ColumnDef } from "@/components/ui/Table.tsx";
import { DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { EmailTemplateImportConflictDialog } from "@/features/templates/email-templates/EmailTemplateImportConflictDialog.tsx";
import {
  exportEmailTemplateAll,
  exportEmailTemplateSingle,
} from "@/features/templates/hooks/emailTemplateExport.ts";
import {
  useDeleteEmailTemplate,
  useEmailTemplates,
  useImportEmailTemplate,
} from "@/features/templates/hooks/useEmailTemplates.ts";
import { useImportQueue } from "@/lib/hooks/useImportQueue.ts";

type ImportTemplateData = EmailTemplateInput;

/**
 * List page showing all email templates with create, delete, import and export actions.
 */
export function EmailTemplateListPage() {
  const { messages, locale } = useI18n();
  const m = messages.emailTemplates;
  const common = messages.common;
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useEmailTemplates();
  const deleteMutation = useDeleteEmailTemplate();
  const importMutation = useImportEmailTemplate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const importQueue = useImportQueue<ImportTemplateData>({
    mutate: (data, cbs) => importMutation.mutate(data, cbs),
    messages: { importSuccess: m.importSuccess, importError: m.importError },
  });

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }


  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    const readFile = (file: File): Promise<ImportTemplateData[]> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const json = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
            if (Array.isArray(json.templates)) {
              resolve(json.templates as ImportTemplateData[]);
            } else if (typeof json.name === "string" && typeof json.bodyText === "string") {
              resolve([json as ImportTemplateData]);
            } else {
              resolve([]);
            }
          } catch {
            resolve([]);
          }
        };
        reader.readAsText(file);
      });

    void Promise.all(files.map(readFile)).then((results) => {
      const queue = results.flat();
      if (queue.length === 0) {
        importQueue.setAlertMessage(m.importInvalidFile);
        return;
      }
      importQueue.processQueue(queue, 0);
    });
  }


  const columns = useMemo<ColumnDef<EmailTemplate>[]>(
    () => [
      {
        id: "name",
        header: m.templateName,
        sortKey: (tpl) => tpl.name.toLowerCase(),
        cell: (tpl) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/email-templates/${tpl.id}`)}
              className="font-medium text-[var(--ds-text)] hover:underline text-left truncate font-mono"
            >
              {tpl.name}
            </button>
            {tpl.isSystemTemplate && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]">
                <LockIcon weight="duotone" className="w-2.5 h-2.5" />
                {m.systemBadge}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "subject",
        header: m.templateSubject,
        cell: (tpl) => (
          <span className="text-[var(--ds-text-muted)] truncate max-w-xs">{tpl.subject || "—"}</span>
        ),
      },
      {
        id: "createdAt",
        header: m.tableCreated,
        sortKey: (tpl) => tpl.createdAt,
        cell: (tpl) => (
          <span className="text-xs text-[var(--ds-text-muted)]">
            {new Date(tpl.createdAt).toLocaleDateString(locale, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        className: "w-[28rem]",
        cell: (tpl) => (
          <div className="flex items-center justify-end gap-2">
            <TableActionButton
              onClick={() => exportEmailTemplateSingle(tpl)}
              icon={<UploadIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={m.exportTemplate}
            />
            <TableActionButton
              onClick={() => navigate(`/email-templates/${tpl.id}`)}
              icon={<FileTextIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={common.edit}
            />
            <TableActionButton
              variant="danger"
              onClick={() => setDeleteTarget({ id: tpl.id, name: tpl.name })}
              disabled={deleteMutation.isPending || tpl.isSystemTemplate}
              icon={<TrashIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={m.deleteTemplate}
            />
          </div>
        ),
      },
    ],
    [m, common, locale, navigate, deleteMutation.isPending],
  );

  return (
    <PageLayout>
      <PageHeader title={m.listTitle}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-1.5 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] transition-colors"
        >
          <DownloadIcon weight="duotone" className="w-3.5 h-3.5" />
          {m.importTemplate}
        </button>
        <button
          type="button"
          onClick={() => void exportEmailTemplateAll()}
          disabled={templates.length === 0}
          className="flex items-center gap-2 px-4 py-1.5 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] transition-colors disabled:opacity-40"
        >
          <UploadIcon weight="duotone" className="w-3.5 h-3.5" />
          {m.exportAll}
        </button>
        <button
          type="button"
          onClick={() => navigate("/email-templates/new")}
          className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
        >
          <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
          {m.newTemplate}
        </button>
      </PageHeader>

      <PageBody>
        {isLoading && (
          <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
            {common.loading}
          </div>
        )}

        {!isLoading && templates.length === 0 && (
          <ContentUnavailableView
            className="flex-1 min-h-0"
            icon={<EnvelopeOpenIcon weight="duotone" aria-hidden />}
            title={m.noTemplates}
            subtitle={m.noTemplatesHint}
          />
        )}

        {!isLoading && templates.length > 0 && (
          <div className="-mx-3 -mt-3">
            <DataTable
              columns={columns}
              data={templates}
              getRowKey={(tpl) => tpl.id}
              stickyHeader
            />
          </div>
        )}
      </PageBody>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Delete confirmation dialog */}
      {deleteTarget !== null && (
        <Dialog
          open={deleteTarget !== null}
          title={m.deleteTemplate}
          titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="px-6 py-4 text-sm text-[var(--ds-text-muted)]">
            {m.deleteTemplateConfirm}{" "}
            <span className="font-medium">({deleteTarget.name})</span>
          </div>
          <Dialog.Footer>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className={dialogBtnSecondary}
            >
              {common.cancel}
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={handleDeleteConfirm}
              className={`${dialogBtnDestructive} flex items-center gap-2`}
            >
              <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
              {deleteMutation.isPending ? "…" : common.delete}
            </button>
          </Dialog.Footer>
        </Dialog>
      )}

      {/* Import alert dialog */}
      <Dialog
        open={importQueue.alertMessage !== null}
        title={importQueue.alertMessage ?? ""}
        titleIcon={<DownloadIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => importQueue.setAlertMessage(null)}
      >
        <Dialog.Footer>
          <button
            type="button"
            onClick={() => importQueue.setAlertMessage(null)}
            className={dialogBtnSecondary}
          >
            {common.close}
          </button>
        </Dialog.Footer>
      </Dialog>

      {importQueue.conflict && (
        <EmailTemplateImportConflictDialog
          templateName={importQueue.conflict.item.name}
          onOverwrite={importQueue.handleConflictOverwrite}
          onRename={importQueue.handleConflictRename}
          onCancel={importQueue.handleConflictSkip}
        />
      )}
    </PageLayout>
  );
}
