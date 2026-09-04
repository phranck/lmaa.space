import { FileTextIcon, PaperPlaneTiltIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import type { SocialMediaPostTemplate } from "@lmaa/contracts";
import { formatDate } from "@lmaa/shared";
import { PLATFORM_MAP } from "@lmaa/ui/social-media-platforms";

import { Chip } from "@/components/ui/Chip.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  CreateActionButton,
  DeleteActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { SystemTemplateChip } from "@/components/ui/SystemTemplateChip.tsx";
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
          <div className="flex min-w-0 items-center gap-2">
            {/* `min-w-0` on the button as well as on the row: a flex item does
                not shrink below its own content without it, and a template name
                in a monospaced face is one token with nothing to break at. */}
            <button
              type="button"
              onClick={() => navigate(`/social-media-post-templates/${template.id}`)}
              className="min-w-0 truncate text-left font-mono font-medium text-[var(--ds-text)] hover:underline"
            >
              {template.name}
            </button>
            {template.isSystemTemplate && <SystemTemplateChip label={m.systemBadge} />}
          </div>
        ),
      },
      {
        id: "platforms",
        header: m.platformsLabel,
        cell: (template) => (
          <div className="flex flex-wrap gap-1">
            {template.platforms.map((platform) => (
              <PlatformChip key={platform} platform={platform} />
            ))}
          </div>
        ),
      },
      {
        id: "scopes",
        header: m.scopesLabel,
        cell: (template) => (
          <div className="flex flex-wrap gap-1">
            {template.scopes.map((scope) => (
              <Chip key={scope}>{m.scopes[scope]}</Chip>
            ))}
          </div>
        ),
      },
      {
        id: "createdAt",
        header: m.tableCreated,
        sortKey: (template) => template.createdAt,
        cell: (template) => (
          <span suppressHydrationWarning className="text-xs text-[var(--ds-text-muted)]">
            {formatDate(template.createdAt, locale)}
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
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              label={common.edit}
            />
            <TableActionButton
              variant="danger"
              onClick={() => setDeleteTarget(template)}
              disabled={deleteMutation.isPending || template.isSystemTemplate}
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
        <CreateActionButton
          type="button"
          onClick={() => navigate("/social-media-post-templates/new")}
          label={m.newTemplate}
        />
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
            <CancelActionButton label={common.cancel} onClick={() => setDeleteTarget(null)} />
            <DeleteActionButton
              disabled={deleteMutation.isPending}
              label={deleteMutation.isPending ? "..." : common.delete}
              onClick={() =>
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                })
              }
            />
          </Dialog.Footer>
        </Dialog>
      )}
    </PageLayout>
  );
}

function PlatformChip({ platform }: { platform: string }) {
  const def = PLATFORM_MAP.get(platform);
  if (!def) return null;
  const Icon = def.icon;
  return <Chip icon={<Icon size={14} />}>{def.label}</Chip>;
}
