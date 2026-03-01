import { Card } from "@/components/ui/Card.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useDeleteEmailTemplate,
  useEmailTemplates,
} from "@/features/email-templates/hooks/useEmailTemplates.ts";
import { useNavigate } from "react-router";
import {
  SFEnvelopeFill,
  SFLockFill,
  SFNewspaperFill,
  SFPlusCircleFill,
  SFTrashFill,
} from "sf-symbols-lib/monochrome";

/**
 * List page showing all email templates with create and delete actions.
 */
export function EmailTemplateListPage() {
  const { messages } = useI18n();
  const m = messages.emailTemplates;
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useEmailTemplates();
  const deleteMutation = useDeleteEmailTemplate();

  async function handleDelete(id: number, name: string) {
    if (!confirm(`${m.deleteTemplateConfirm} (${name})`)) return;
    await deleteMutation.mutateAsync(id);
  }

  return (
    <>
      <PageHeader title={m.listTitle}>
        <button
          type="button"
          onClick={() => navigate("/email-templates/new")}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
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
        <div className="p-3">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ds-border)] text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">{m.templateName}</th>
                  <th className="text-left px-4 py-3">{m.templateSubject}</th>
                  <th className="text-left px-4 py-3">{m.tableCreated}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr
                    key={tpl.id}
                    className="border-b border-[var(--ds-border)] last:border-0 hover:bg-[var(--ds-surface-hover)] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--ds-text)]">
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
                    <td className="px-4 py-3 text-[var(--ds-text-muted)] truncate max-w-xs">
                      {tpl.subject || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--ds-text-muted)] text-xs whitespace-nowrap">
                      {new Date(tpl.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/email-templates/${tpl.id}`)}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-[var(--ds-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--ds-surface-hover)] rounded transition-colors"
                        >
                          <SFNewspaperFill className="w-3.5 h-3.5" />
                          {messages.common.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl.id, tpl.name)}
                          disabled={deleteMutation.isPending || tpl.isSystemTemplate}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-[var(--ds-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors disabled:opacity-40"
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
        </div>
      )}
    </>
  );
}
