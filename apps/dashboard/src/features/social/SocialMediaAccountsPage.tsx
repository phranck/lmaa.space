import {
  ArrowSquareOutIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type React from "react";
import { useMemo, useState } from "react";

import type { SocialMediaAccount } from "@lmaa/contracts";
import { PLATFORM_MAP } from "@lmaa/ui/social-media-platforms";
import { ToggleSwitch } from "@lmaa/ui/toggle-switch";

import { BADGE_TONES, Badge } from "@/components/ui/Badge.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  CreateActionButton,
  DeleteActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  AccountFormDialog,
  type AccountFormDialogTarget,
} from "@/features/social/AccountFormDialog.tsx";
import {
  useDeleteSocialMediaAccount,
  useSocialMediaAccounts,
  useUpdateSocialMediaAccount,
} from "@/features/social/hooks/useSocialMediaAccounts.ts";

interface DeleteTarget {
  id: number;
  label: string;
}

export function SocialMediaAccountsPage(): React.ReactElement {
  const { messages } = useI18n();
  const t = messages.socialMedia;
  const common = messages.common;

  const accountsQuery = useSocialMediaAccounts();
  const updateMutation = useUpdateSocialMediaAccount();
  const deleteMutation = useDeleteSocialMediaAccount();

  const [dialogTarget, setDialogTarget] = useState<AccountFormDialogTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const isLoading = accountsQuery.isLoading;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const rows = accountsQuery.data ?? [];

  const columns: ColumnDef<SocialMediaAccount>[] = useMemo(
    () => [
      {
        id: "platform",
        header: t.columns.platform,
        sortKey: (row) => row.platform,
        cell: (row) => {
          const platform = PLATFORM_MAP.get(row.platform);
          if (!platform) return <span>{row.platform}</span>;
          const Icon = platform.icon;
          return (
            <span className="inline-flex items-center gap-2 text-[var(--ds-text)]">
              <Icon size={16} />
              {platform.label}
            </span>
          );
        },
      },
      {
        id: "label",
        header: t.columns.account,
        sortKey: (row) => row.label,
        cell: (row) => <span className="font-medium text-[var(--ds-text)]">{row.label}</span>,
      },
      {
        id: "profileUrl",
        header: t.columns.profileUrl,
        sortKey: (row) => row.profileUrl,
        cell: (row) =>
          row.profileUrl ? (
            <a
              href={row.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-[20rem] items-center gap-1 truncate text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
              title={row.profileUrl}
            >
              <span className="truncate">{row.profileUrl}</span>
              <ArrowSquareOutIcon weight="bold" className="size-3 shrink-0" />
            </a>
          ) : (
            <span className="text-[var(--ds-text-muted)]">-</span>
          ),
      },
      {
        id: "posting",
        header: t.columns.posting,
        sortKey: (row) => Number(row.canPost),
        cell: (row) => (
          <Badge colorClass={row.canPost ? BADGE_TONES.success : BADGE_TONES.neutral}>
            {row.canPost ? t.badges.yes : t.badges.no}
          </Badge>
        ),
      },
      {
        id: "footer",
        header: t.columns.footer,
        sortKey: (row) => Number(row.showInFooter),
        cell: (row) => (
          <Badge colorClass={row.showInFooter ? BADGE_TONES.info : BADGE_TONES.neutral}>
            {row.showInFooter ? t.badges.yes : t.badges.no}
          </Badge>
        ),
      },
      {
        id: "active",
        header: t.columns.status,
        sortKey: (row) => Number(row.isActive),
        cell: (row) => (
          <ToggleSwitch
            checked={row.isActive}
            disabled={isUpdating || !row.canPost}
            onChange={(value) => {
              updateMutation.mutate({ id: row.id, input: { isActive: value } });
            }}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cellClassName: "text-right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <TableActionButton
              variant="neutral"
              icon={<PencilSimpleIcon weight="duotone" className="size-3.5" />}
              label={common.edit}
              onClick={() => setDialogTarget({ mode: "edit", account: row })}
            />
            <TableActionButton
              variant="danger"
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
              label={common.delete}
              onClick={() => setDeleteTarget({ id: row.id, label: row.label })}
            />
          </div>
        ),
      },
    ],
    [t, common, isUpdating, updateMutation],
  );

  return (
    <PageLayout>
      <PageHeader title={t.title}>
        <CreateActionButton
          type="button"
          onClick={() => setDialogTarget({ mode: "create" })}
          label={t.addAccountTitle}
        />
      </PageHeader>

      <PageBody>
        {isLoading && (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--ds-text-muted)]">
            {common.loading}
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <ContentUnavailableView
            chromeless
            icon={<ShareNetworkIcon weight="duotone" aria-hidden />}
            title={t.noAccounts}
            subtitle={t.noAccountsHint}
          />
        )}

        {!isLoading && rows.length > 0 && (
          <DataTable
            columns={columns}
            data={rows}
            getRowKey={(row) => `${row.platform}:${row.id}`}
            stickyHeader
          />
        )}
      </PageBody>

      {dialogTarget && (
        <AccountFormDialog target={dialogTarget} onClose={() => setDialogTarget(null)} />
      )}

      {deleteTarget && (
        <Dialog
          open
          title={t.deleteAccount}
          titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="px-6 py-4 text-sm text-[var(--ds-text-muted)]">
            {t.deleteConfirm} <span className="font-medium">{deleteTarget.label}</span>
          </div>
          <Dialog.Footer>
            <CancelActionButton label={common.cancel} onClick={() => setDeleteTarget(null)} />
            <DeleteActionButton
              disabled={isDeleting}
              label={isDeleting ? "..." : common.delete}
              onClick={() => {
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            />
          </Dialog.Footer>
        </Dialog>
      )}
    </PageLayout>
  );
}
