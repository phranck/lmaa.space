import { PencilSimpleIcon, PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";

import type { BlueskyAccount, MastodonAccount } from "@lmaa/contracts";
import { type PlatformDef, PLATFORM_MAP, ToggleSwitch } from "@lmaa/ui";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
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

  const mastoPlatform = PLATFORM_MAP.get("mastodon");
  const bskyPlatform = PLATFORM_MAP.get("bluesky");

  return (
    <PageLayout>
      <PageHeader title={t.title} />

      <PageBody>
        {mastoPlatform && (
          <MastodonSection
            platform={mastoPlatform}
            account={masto.data ?? null}
            isLoading={masto.isLoading}
            t={t}
            common={common}
            isUpdating={updateMasto.isPending}
            onAdd={() => setDialogTarget({ mode: "create", platform: "mastodon" })}
            onEdit={(account) =>
              setDialogTarget({ mode: "edit", platform: "mastodon", account })
            }
            onDelete={(account) =>
              setDeleteTarget({
                platform: "mastodon",
                id: account.id,
                label: account.label,
              })
            }
            onToggleActive={(account, isActive) =>
              updateMasto.mutate({ id: account.id, input: { isActive } })
            }
          />
        )}

        {bskyPlatform && (
          <BlueskySection
            platform={bskyPlatform}
            account={bsky.data ?? null}
            isLoading={bsky.isLoading}
            t={t}
            common={common}
            isUpdating={updateBsky.isPending}
            onAdd={() => setDialogTarget({ mode: "create", platform: "bluesky" })}
            onEdit={(account) =>
              setDialogTarget({ mode: "edit", platform: "bluesky", account })
            }
            onDelete={(account) =>
              setDeleteTarget({
                platform: "bluesky",
                id: account.id,
                label: account.label,
              })
            }
            onToggleActive={(account, isActive) =>
              updateBsky.mutate({ id: account.id, input: { isActive } })
            }
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
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className={dialogBtnSecondary}
            >
              {common.cancel}
            </button>
            <button
              type="button"
              disabled={deleteMasto.isPending || deleteBsky.isPending}
              onClick={() => {
                if (deleteTarget.platform === "mastodon") {
                  deleteMasto.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                } else {
                  deleteBsky.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
              className={dialogBtnDestructive}
            >
              {deleteMasto.isPending || deleteBsky.isPending ? "..." : common.delete}
            </button>
          </Dialog.Footer>
        </Dialog>
      )}
    </PageLayout>
  );
}

// ─── Mastodon section ───────────────────────────────────────────────────────

type MastodonProps = {
  platform: PlatformDef;
  account: MastodonAccount | null;
  isLoading: boolean;
  t: ReturnType<typeof useI18n>["messages"]["socialMedia"];
  common: ReturnType<typeof useI18n>["messages"]["common"];
  isUpdating: boolean;
  onAdd: () => void;
  onEdit: (account: MastodonAccount) => void;
  onDelete: (account: MastodonAccount) => void;
  onToggleActive: (account: MastodonAccount, isActive: boolean) => void;
};

function MastodonSection({
  platform,
  account,
  isLoading,
  t,
  common,
  isUpdating,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}: MastodonProps): React.ReactElement {
  const Icon = platform.icon;

  return (
    <section className="rounded-card border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--ds-text)]">
          <Icon size={16} />
          {platform.label}
        </h2>
        {!account && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
          >
            <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
            {t.addMastodonAccount}
          </button>
        )}
      </header>

      {isLoading && (
        <div className="px-4 py-6 text-sm text-[var(--ds-text-muted)]">{common.loading}</div>
      )}

      {!isLoading && !account && (
        <div className="px-4 py-6">
          <ContentUnavailableView
            chromeless
            icon={<Icon aria-hidden />}
            title={t.noAccounts}
            subtitle={t.noAccountsHint}
          />
        </div>
      )}

      {!isLoading && account && (
        <AccountRow
          label={account.label}
          subtitle={account.instanceUrl}
          tokenStored={account.hasAccessToken}
          tokenStoredText={t.tokenStored}
          tokenMissingText={t.tokenMissing}
          isActive={account.isActive}
          isUpdating={isUpdating}
          onToggleActive={(value) => onToggleActive(account, value)}
          onEdit={() => onEdit(account)}
          onDelete={() => onDelete(account)}
          editLabel={common.edit}
          deleteLabel={common.delete}
        />
      )}
    </section>
  );
}

// ─── BlueSky section ───────────────────────────────────────────────────────

type BlueskyProps = {
  platform: PlatformDef;
  account: BlueskyAccount | null;
  isLoading: boolean;
  t: ReturnType<typeof useI18n>["messages"]["socialMedia"];
  common: ReturnType<typeof useI18n>["messages"]["common"];
  isUpdating: boolean;
  onAdd: () => void;
  onEdit: (account: BlueskyAccount) => void;
  onDelete: (account: BlueskyAccount) => void;
  onToggleActive: (account: BlueskyAccount, isActive: boolean) => void;
};

function BlueskySection({
  platform,
  account,
  isLoading,
  t,
  common,
  isUpdating,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}: BlueskyProps): React.ReactElement {
  const Icon = platform.icon;

  return (
    <section className="rounded-card border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--ds-text)]">
          <Icon size={16} />
          {t.bluesky.sectionTitle}
        </h2>
        {!account && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
          >
            <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
            {t.bluesky.addAccount}
          </button>
        )}
      </header>

      {isLoading && (
        <div className="px-4 py-6 text-sm text-[var(--ds-text-muted)]">{common.loading}</div>
      )}

      {!isLoading && !account && (
        <div className="px-4 py-6">
          <ContentUnavailableView
            chromeless
            icon={<Icon aria-hidden />}
            title={t.bluesky.empty}
            subtitle={t.noAccountsHint}
          />
        </div>
      )}

      {!isLoading && account && (
        <AccountRow
          label={account.label}
          subtitle={`@${account.handle}`}
          tokenStored={account.hasAccessToken}
          tokenStoredText={t.tokenStored}
          tokenMissingText={t.tokenMissing}
          isActive={account.isActive}
          isUpdating={isUpdating}
          onToggleActive={(value) => onToggleActive(account, value)}
          onEdit={() => onEdit(account)}
          onDelete={() => onDelete(account)}
          editLabel={common.edit}
          deleteLabel={common.delete}
        />
      )}
    </section>
  );
}

// ─── Reusable account row ───────────────────────────────────────────────────

interface AccountRowProps {
  label: string;
  subtitle: string;
  tokenStored: boolean;
  tokenStoredText: string;
  tokenMissingText: string;
  isActive: boolean;
  isUpdating: boolean;
  onToggleActive: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
}

function AccountRow({
  label,
  subtitle,
  tokenStored,
  tokenStoredText,
  tokenMissingText,
  isActive,
  isUpdating,
  onToggleActive,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: AccountRowProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[var(--ds-text)]">{label}</div>
        <div className="text-xs text-[var(--ds-text-muted)] truncate">{subtitle}</div>
      </div>

      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          tokenStored
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]"
        }`}
      >
        {tokenStored ? tokenStoredText : tokenMissingText}
      </span>

      <ToggleSwitch checked={isActive} disabled={isUpdating} onChange={onToggleActive} />

      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--ds-btn-neutral-border)] text-[var(--ds-text)] rounded-control text-sm hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)]"
      >
        <PencilSimpleIcon weight="duotone" className="w-3.5 h-3.5" />
        {editLabel}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)]"
      >
        <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
        {deleteLabel}
      </button>
    </div>
  );
}
