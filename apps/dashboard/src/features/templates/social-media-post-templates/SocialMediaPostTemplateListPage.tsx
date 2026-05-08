import { FileTextIcon, PaperPlaneTiltIcon, PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import type { SocialMediaPostTemplate } from "@lmaa/contracts";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { SystemTemplateBadge } from "@/components/ui/SystemTemplateBadge.tsx";
import type { ColumnDef } from "@/components/ui/Table.tsx";
import { DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useDeleteSocialMediaPostTemplate,
  useSocialMediaPostTemplates,
} from "@/features/templates/hooks/useSocialMediaPostTemplates.ts";

export function SocialMediaPostTemplateListPage() {
  const { messages, locale } = useI18n();
  const m = messages.socialMediaTemplates;
  const common = messages.common;
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useSocialMediaPostTemplates();
  const deleteMutation = useDeleteSocialMediaPostTemplate();
  const [deleteTarget, setDeleteTarget] = useState<SocialMediaPostTemplate | null>(null);

  const columns = useMemo<ColumnDef<SocialMediaPostTemplate>[]>(
    () => [
      {
        id: "name",
        header: m.templateName,
        sortKey: (template) => template.name.toLowerCase(),
        cell: (template) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/social-media-post-templates/${template.id}`)}
              className="truncate text-left font-mono font-medium text-[var(--ds-text)] hover:underline"
            >
              {template.name}
            </button>
            {template.isSystemTemplate && <SystemTemplateBadge label={m.systemBadge} />}
          </div>
        ),
      },
      {
        id: "createdAt",
        header: m.tableCreated,
        sortKey: (template) => template.createdAt,
        cell: (template) => (
          <span className="text-xs text-[var(--ds-text-muted)]">
            {new Date(template.createdAt).toLocaleDateString(locale, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        className: "w-[18rem]",
        cell: (template) => (
          <div className="flex justify-end gap-2">
            <TableActionButton
              onClick={() => navigate(`/social-media-post-templates/${template.id}`)}
              icon={<FileTextIcon weight="duotone" className="h-3.5 w-3.5" />}
              label={common.edit}
            />
            <TableActionButton
              variant="danger"
              onClick={() => setDeleteTarget(template)}
              disabled={deleteMutation.isPending || template.isSystemTemplate}
              icon={<TrashIcon weight="duotone" className="h-3.5 w-3.5" />}
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
          onClick={() => navigate("/social-media-post-templates/new")}
          className="flex h-9 items-center gap-2 rounded-control border border-[var(--ds-btn-primary-border)] px-4 text-sm font-medium text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
        >
          <PlusCircleIcon weight="duotone" className="h-3.5 w-3.5" />
          {m.newTemplate}
        </button>
      </PageHeader>

      <PageBody>
        {isLoading && (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--ds-text-muted)]">
            {common.loading}
          </div>
        )}

        {!isLoading && templates.length === 0 && (
          <ContentUnavailableView
            chromeless
            className="flex-1 min-h-0"
            icon={<PaperPlaneTiltIcon weight="duotone" aria-hidden />}
            title={m.noTemplates}
            subtitle={m.noTemplatesHint}
          />
        )}

        {!isLoading && templates.length > 0 && (
          <div className="-mx-3 -mt-3">
            <DataTable
              columns={columns}
              data={templates}
              getRowKey={(template) => template.id}
              stickyHeader
            />
          </div>
        )}
      </PageBody>

      {deleteTarget && (
        <Dialog
          open
          title={m.deleteTemplate}
          titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="px-6 py-4 text-sm text-[var(--ds-text-muted)]">
            {m.deleteTemplateConfirm} <span className="font-medium">({deleteTarget.name})</span>
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
              onClick={() =>
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                })
              }
              className={`${dialogBtnDestructive} flex items-center gap-2`}
            >
              <TrashIcon weight="duotone" className="h-3.5 w-3.5" />
              {deleteMutation.isPending ? "..." : common.delete}
            </button>
          </Dialog.Footer>
        </Dialog>
      )}
    </PageLayout>
  );
}
