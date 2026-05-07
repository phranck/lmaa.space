import { MastodonLogoIcon, PencilSimpleIcon, PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import type React from "react";
import { useMemo, useState } from "react";

import type { MastodonAccount } from "@lmaa/contracts";
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
import { type DataTableGroup, type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { AccountFormDialog } from "@/features/social/AccountFormDialog.tsx";
import {
  useDeleteMastodonAccount,
  useMastodonAccounts,
  useUpdateMastodonAccount,
} from "@/features/social/hooks/useMastodonAccounts.ts";

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogTarget =
  | { mode: "create" }
  | { mode: "edit"; account: MastodonAccount };

// ─── Component ───────────────────────────────────────────────────────────────

export function SocialMediaAccountsPage(): React.ReactElement {
  const { messages } = useI18n();
  const t = messages.socialMedia;
  const common = messages.common;

  const { data: accounts = [], isLoading } = useMastodonAccounts();
  const updateAccount = useUpdateMastodonAccount();
  const deleteAccount = useDeleteMastodonAccount();

  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MastodonAccount | null>(null);

  // ─── Groups ─────────────────────────────────────────────────────────────

  const groups = useMemo<DataTableGroup<MastodonAccount>[]>(() => {
    const mastodon = accounts.filter(() => true); // all accounts are mastodon for now
    if (mastodon.length === 0) return [];
    const platform = PLATFORM_MAP.get("mastodon");
    if (!platform) return [];
    const Icon = platform.icon;
    return [
      {
        id: "mastodon",
        header: (
          <span className="flex items-center gap-1.5">
            <Icon size={14} />
            {`${platform.label} · ${mastodon.length}`}
          </span>
        ),
        rows: mastodon,
      },
    ];
  }, [accounts]);

  // ─── Columns ────────────────────────────────────────────────────────────

  const columns: ColumnDef<MastodonAccount>[] = useMemo(
    () => [
      {
        id: "label",
        header: t.columns.account,
        sortKey: (row) => row.label,
        cell: (row) => (
          <span className="font-medium text-[var(--ds-text)]">{row.label}</span>
        ),
      },
      {
        id: "instance",
        header: t.columns.instance,
        sortKey: (row) => row.instanceUrl,
        cell: (row) => (
          <span className="text-[var(--ds-text-muted)]">{row.instanceUrl}</span>
        ),
      },
      {
        id: "visibility",
        header: t.columns.visibility,
        sortKey: (row) => t.visibility[row.visibility],
        cell: (row) => (
          <span className="text-[var(--ds-text-muted)]">{t.visibility[row.visibility]}</span>
        ),
      },
      {
        id: "tokenStatus",
        header: t.columns.token,
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              row.hasAccessToken
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]"
            }`}
          >
            {row.hasAccessToken ? t.tokenStored : t.tokenMissing}
          </span>
        ),
      },
      {
        id: "active",
        header: t.columns.status,
        sortKey: (row) => Number(row.isActive),
        cell: (row) => (
          <ToggleSwitch
            checked={row.isActive}
            disabled={updateAccount.isPending}
            onChange={(value) =>
              updateAccount.mutate({ id: row.id, input: { isActive: value } })
            }
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
              onClick={() => setDialogTarget({ mode: "edit", account: row })}
            />
            <TableActionButton
              variant="danger"
              icon={<TrashIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={common.delete}
              onClick={() => setDeleteTarget(row)}
            />
          </div>
        ),
      },
    ],
    [t, common, updateAccount],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

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

        {!isLoading && accounts.length === 0 && (
          <ContentUnavailableView
            chromeless
            icon={<MastodonLogoIcon weight="duotone" aria-hidden />}
            title={t.noAccounts}
            subtitle={t.noAccountsHint}
          />
        )}

        {!isLoading && accounts.length > 0 && (
          <DataTable
            columns={columns}
            groups={groups}
            getRowKey={(row) => row.id}
            stickyHeader
          />
        )}
      </PageBody>

      {dialogTarget && (
        <AccountFormDialog
          target={dialogTarget}
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
              disabled={deleteAccount.isPending}
              onClick={() =>
                deleteAccount.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                })
              }
              className={dialogBtnDestructive}
            >
              {deleteAccount.isPending ? "..." : common.delete}
            </button>
          </Dialog.Footer>
        </Dialog>
      )}
    </PageLayout>
  );
}
