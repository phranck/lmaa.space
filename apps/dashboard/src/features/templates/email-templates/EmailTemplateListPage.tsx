import { Card } from "@/components/ui/Card.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { Dialog, dialogBtnSecondary } from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
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
import type { EmailTemplateInput } from "@lmaa/contracts";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  SFEnvelopeFill,
  SFLockFill,
  SFLongTextPageAndPencilFill,
  SFPlusCircleFill,
  SFSquareAndArrowDown,
  SFSquareAndArrowUp,
  SFTrashFill,
} from "sf-symbols-lib/monochrome";

type ImportTemplateData = EmailTemplateInput;

/**
 * List page showing all email templates with create, delete, import and export actions.
 */
export function EmailTemplateListPage() {
  const { messages, locale } = useI18n();
  const m = messages.emailTemplates;
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useEmailTemplates();
  const deleteMutation = useDeleteEmailTemplate();
  const importMutation = useImportEmailTemplate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [importConflict, setImportConflict] = useState<{
    template: ImportTemplateData;
    remaining: ImportTemplateData[];
    imported: number;
  } | null>(null);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`${m.deleteTemplateConfirm} (${name})`)) return;
    await deleteMutation.mutateAsync(id);
  }

  function processImportQueue(queue: ImportTemplateData[], imported: number) {
    if (queue.length === 0) {
      if (imported > 0) {
        setAlertMessage(m.importSuccess.replace("{n}", String(imported)));
      }
      return;
    }

    const [current, ...remaining] = queue;
    importMutation.mutate(
      { ...current, overwrite: false },
      {
        onSuccess: () => processImportQueue(remaining, imported + 1),
        onError: (err: unknown) => {
          const status =
            err && typeof err === "object" && "status" in err
              ? (err as { status: number }).status
              : 0;
          if (status === 409) {
            setImportConflict({ template: current, remaining, imported });
          } else {
            setAlertMessage(m.importError);
            processImportQueue(remaining, imported);
          }
        },
      },
    );
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
        setAlertMessage(m.importInvalidFile);
        return;
      }
      processImportQueue(queue, 0);
    });
  }

  function handleConflictOverwrite() {
    if (!importConflict) return;
    const { template, remaining, imported } = importConflict;
    setImportConflict(null);
    importMutation.mutate(
      { ...template, overwrite: true },
      {
        onSuccess: () => processImportQueue(remaining, imported + 1),
        onError: () => {
          setAlertMessage(m.importError);
          processImportQueue(remaining, imported);
        },
      },
    );
  }

  function handleConflictRename(newName: string) {
    if (!importConflict) return;
    const { template, remaining, imported } = importConflict;
    setImportConflict(null);
    processImportQueue([{ ...template, name: newName }, ...remaining], imported);
  }

  function handleConflictSkip() {
    if (!importConflict) return;
    const { remaining, imported } = importConflict;
    setImportConflict(null);
    processImportQueue(remaining, imported);
  }

  return (
    <>
      <PageHeader title={m.listTitle}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] transition-colors"
        >
          <SFSquareAndArrowDown className="w-3.5 h-3.5" />
          {m.importTemplate}
        </button>
        <button
          type="button"
          onClick={() => void exportEmailTemplateAll()}
          disabled={templates.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] transition-colors disabled:opacity-40"
        >
          <SFSquareAndArrowUp className="w-3.5 h-3.5" />
          {m.exportAll}
        </button>
        <button
          type="button"
          onClick={() => navigate("/email-templates/new")}
          className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
        >
          <SFPlusCircleFill className="w-3.5 h-3.5" />
          {m.newTemplate}
        </button>
      </PageHeader>

      {isLoading && (
        <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
          {messages.common.loading}
        </div>
      )}

      {!isLoading && templates.length === 0 && (
        <ContentUnavailableView
          className="flex-1"
          icon={<SFEnvelopeFill aria-hidden />}
          title={m.noTemplates}
          subtitle={m.noTemplatesHint}
        />
      )}

      {!isLoading && templates.length > 0 && (
        <Card className="overflow-hidden rounded-control">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--ds-border)] text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
                <th className="text-left px-4 py-1.5">{m.templateName}</th>
                <th className="text-left px-4 py-1.5">{m.templateSubject}</th>
                <th className="text-left px-4 py-1.5">{m.tableCreated}</th>
                <th className="px-4 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr
                  key={tpl.id}
                  className="border-b border-[var(--ds-border)] last:border-0 hover:bg-[var(--ds-surface-hover)] transition-colors"
                >
                  <td className="px-4 py-1.5 font-medium text-[var(--ds-text)]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/email-templates/${tpl.id}`)}
                        className="hover:underline text-left font-mono"
                      >
                        {tpl.name}
                      </button>
                      {tpl.isSystemTemplate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]">
                          <SFLockFill className="w-2.5 h-2.5" />
                          {m.systemBadge}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-1.5 text-[var(--ds-text-muted)] truncate max-w-xs">
                    {tpl.subject || "—"}
                  </td>
                  <td className="px-4 py-1.5 text-[var(--ds-text-muted)] text-xs whitespace-nowrap">
                    {new Date(tpl.createdAt).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => exportEmailTemplateSingle(tpl)}
                        className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                      >
                        <SFSquareAndArrowUp className="w-3.5 h-3.5" />
                        {m.exportTemplate}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/email-templates/${tpl.id}`)}
                        className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                      >
                        <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                        {messages.common.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tpl.id, tpl.name)}
                        disabled={deleteMutation.isPending || tpl.isSystemTemplate}
                        className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors disabled:opacity-40"
                      >
                        <SFTrashFill className="w-3.5 h-3.5" />
                        {m.deleteTemplate}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog
        open={alertMessage !== null}
        title={alertMessage ?? ""}
        onClose={() => setAlertMessage(null)}
      >
        <Dialog.Footer>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className={dialogBtnSecondary}
          >
            {messages.common.close}
          </button>
        </Dialog.Footer>
      </Dialog>

      {importConflict && (
        <EmailTemplateImportConflictDialog
          templateName={importConflict.template.name}
          onOverwrite={handleConflictOverwrite}
          onRename={handleConflictRename}
          onCancel={handleConflictSkip}
        />
      )}
    </>
  );
}
