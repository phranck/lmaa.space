import {
  PencilSimpleIcon,
  PlusCircleIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type React from "react";
import { useMemo, useState } from "react";

import type { BlueskyAccount, MastodonAccount } from "@lmaa/contracts";
import { PLATFORM_MAP, ToggleSwitch } from "@lmaa/ui";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
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
  useBlueskyAccount,
  useDeleteBlueskyAccount,
  useUpdateBlueskyAccount,
} from "@/features/social/hooks/useBlueskyAccount.ts";
import {
  useDeleteMastodonAccount,
  useMastodonAccount,
  useUpdateMastodonAccount,
} from "@/features/social/hooks/useMastodonAccount.ts";

type AccountRow =
  | { kind: "mastodon"; account: MastodonAccount }
  | { kind: "bluesky"; account: BlueskyAccount };

type DeleteTarget =
  | { platform: "mastodon"; id: number; label: string }
  | { platform: "bluesky"; id: number; label: string };

export function SocialMediaAccountsPage(): React.ReactElement {
  const { messages } = useI18n();
  const t = messages.socialMedia;
  const common = messages.common;

  const masto = useMastodonAccount();
  const bsky = useBlueskyAccount();
  const updateMasto = useUpdateMastodonAccount();
  const deleteMasto = useDeleteMastodonAccount();
  const updateBsky = useUpdateBlueskyAccount();
  const deleteBsky = useDeleteBlueskyAccount();

  const [dialogTarget, setDialogTarget] = useState<AccountFormDialogTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const isLoading = masto.isLoading || bsky.isLoading;
  const isUpdating = updateMasto.isPending || updateBsky.isPending;
  const isDeleting = deleteMasto.isPending || deleteBsky.isPending;

  const rows = useMemo<AccountRow[]>(() => {
    const list: AccountRow[] = [];
    if (masto.data) list.push({ kind: "mastodon", account: masto.data });
    if (bsky.data) list.push({ kind: "bluesky", account: bsky.data });
    return list;
  }, [masto.data, bsky.data]);

  const columns: ColumnDef<AccountRow>[] = useMemo(
    () => [
      {
        id: "platform",
        header: t.columns.platform,
        sortKey: (row) => row.kind,
        cell: (row) => {
          const platform = PLATFORM_MAP.get(row.kind);
          if (!platform) return <span>{row.kind}</span>;
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
        id: "account",
        header: t.columns.account,
        sortKey: (row) => row.account.label,
        cell: (row) => (
          <span className="font-medium text-[var(--ds-text)]">{row.account.label}</span>
        ),
      },
      {
        id: "identifier",
        header: t.columns.identifier,
        sortKey: (row) =>
          row.kind === "mastodon" ? row.account.instanceUrl : row.account.handle,
        cell: (row) => (
          <span className="text-[var(--ds-text-muted)]">
            {row.kind === "mastodon" ? row.account.instanceUrl : `@${row.account.handle}`}
          </span>
        ),
      },
      {
        id: "tokenStatus",
        header: t.columns.token,
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              row.account.hasAccessToken
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]"
            }`}
          >
            {row.account.hasAccessToken ? t.tokenStored : t.tokenMissing}
          </span>
        ),
      },
      {
        id: "active",
        header: t.columns.status,
        sortKey: (row) => Number(row.account.isActive),
        cell: (row) => (
          <ToggleSwitch
            checked={row.account.isActive}
            disabled={isUpdating}
            onChange={(value) => {
              if (row.kind === "mastodon") {
                updateMasto.mutate({ id: row.account.id, input: { isActive: value } });
              } else {
                updateBsky.mutate({ id: row.account.id, input: { isActive: value } });
              }
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
              icon={<PencilSimpleIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={common.edit}
              onClick={() => {
                if (row.kind === "mastodon") {
                  setDialogTarget({ mode: "edit", platform: "mastodon", account: row.account });
                } else {
                  setDialogTarget({ mode: "edit", platform: "bluesky", account: row.account });
                }
              }}
            />
            <TableActionButton
              variant="danger"
              icon={<TrashIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={common.delete}
              onClick={() =>
                setDeleteTarget({
                  platform: row.kind,
                  id: row.account.id,
                  label: row.account.label,
                })
              }
            />
          </div>
        ),
      },
    ],
    [t, common, isUpdating, updateMasto, updateBsky],
  );

  return (
    <PageLayout>
      <PageHeader title={t.title}>
        <button
          type="button"
          onClick={() => setDialogTarget({ mode: "create" })}
          className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
        >
          <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
          {t.addAccountTitle}
        </button>
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
            getRowKey={(row) => `${row.kind}:${row.account.id}`}
            stickyHeader
          />
        )}
      </PageBody>

      {dialogTarget && (
        <AccountFormDialog
          target={dialogTarget}
          existingMastodon={Boolean(masto.data)}
          existingBluesky={Boolean(bsky.data)}
          onClose={() => setDialogTarget(null)}
        />
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
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className={dialogBtnSecondary}
            >
              {common.cancel}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                const onSuccess = () => setDeleteTarget(null);
                if (deleteTarget.platform === "mastodon") {
                  deleteMasto.mutate(deleteTarget.id, { onSuccess });
                } else {
                  deleteBsky.mutate(deleteTarget.id, { onSuccess });
                }
              }}
              className={dialogBtnDestructive}
            >
              {isDeleting ? "..." : common.delete}
            </button>
          </Dialog.Footer>
        </Dialog>
      )}
    </PageLayout>
  );
}
