import {
  DownloadIcon,
  EnvelopeOpenIcon,
  FileTextIcon,
  TrashIcon,
  UploadIcon,
} from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import type { EmailTemplate, EmailTemplateInput } from "@lmaa/contracts";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  CreateActionButton,
  CloseActionButton,
  DeleteActionButton,
  ExportActionButton,
  ImportActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import {
  Dialog,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { SystemTemplateBadge } from "@/components/ui/SystemTemplateBadge.tsx";
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
            {tpl.isSystemTemplate && <SystemTemplateBadge label={m.systemBadge} />}
          </div>
        ),
      },
      {
        id: "subject",
        header: m.templateSubject,
        cell: (tpl) => (
          <span className="text-[var(--ds-text-muted)] truncate max-w-xs">{tpl.subject || "-"}</span>
        ),
      },
      {
        id: "createdAt",
        header: m.tableCreated,
        sortKey: (tpl) => tpl.createdAt,
        cell: (tpl) => (
          <span suppressHydrationWarning className="text-xs text-[var(--ds-text-muted)]">
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
              icon={<UploadIcon weight="duotone" className="size-3.5" />}
              label={m.exportTemplate}
            />
            <TableActionButton
              onClick={() => navigate(`/email-templates/${tpl.id}`)}
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              label={common.edit}
            />
            <TableActionButton
              variant="danger"
              onClick={() => setDeleteTarget({ id: tpl.id, name: tpl.name })}
              disabled={deleteMutation.isPending || tpl.isSystemTemplate}
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
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
        <ImportActionButton
          type="button"
          onClick={() => fileInputRef.current?.click()}
          label={m.importTemplate}
          variant="neutral"
        />
        <ExportActionButton
          type="button"
          onClick={() => void exportEmailTemplateAll()}
          disabled={templates.length === 0}
          label={m.exportAll}
          variant="neutral"
        />
        <CreateActionButton
          type="button"
          onClick={() => navigate("/email-templates/new")}
          label={m.newTemplate}
        />
      </PageHeader>

      <PageBody>
        {isLoading && (
          <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
            {common.loading}
          </div>
        )}

        {!isLoading && templates.length === 0 && (
          <ContentUnavailableView
            chromeless
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
        aria-label={m.importTemplate}
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
            <CancelActionButton label={common.cancel} onClick={() => setDeleteTarget(null)} />
            <DeleteActionButton
              disabled={deleteMutation.isPending}
              label={deleteMutation.isPending ? "…" : common.delete}
              onClick={handleDeleteConfirm}
            />
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
          <CloseActionButton
            iconOnly={false}
            label={common.close}
            onClick={() => importQueue.setAlertMessage(null)}
            variant="neutral"
          />
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
