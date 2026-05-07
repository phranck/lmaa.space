import {
  CheckCircleIcon,
  MastodonLogoIcon,
  PlusCircleIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import type { MastodonAccount, MastodonVisibility } from "@lmaa/contracts";
import type { ApiRequestError } from "@lmaa/shared";
import { DashboardSection, ToggleSwitch } from "@lmaa/ui";

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
  type MastodonAccountFormInput,
  useCreateMastodonAccount,
  useDeleteMastodonAccount,
  useMastodonAccounts,
  useUpdateMastodonAccount,
} from "@/features/social/hooks/useMastodonAccounts.ts";

const inputClass =
  "w-full h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const selectClass =
  "w-full h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

const VISIBILITY_OPTIONS: MastodonVisibility[] = ["public", "unlisted", "private", "direct"];

function emptyForm(): MastodonAccountFormInput {
  return {
    label: "",
    instanceUrl: "",
    username: "",
    accessToken: "",
    visibility: "public",
    isActive: true,
  };
}

function formFromAccount(account: MastodonAccount): MastodonAccountFormInput {
  return {
    label: account.label,
    instanceUrl: account.instanceUrl,
    username: account.username ?? "",
    accessToken: "",
    visibility: account.visibility,
    isActive: account.isActive,
  };
}

interface AccountFormProps {
  form: MastodonAccountFormInput;
  onChange: (form: MastodonAccountFormInput) => void;
  visibilityLabels: Record<MastodonVisibility, string>;
  labels: {
    label: string;
    instanceUrl: string;
    username: string;
    accessToken: string;
    accessTokenOptional: string;
    visibility: string;
    active: string;
  };
  tokenPlaceholder: string;
  requireToken: boolean;
  showActiveField?: boolean;
}

function AccountForm({
  form,
  onChange,
  visibilityLabels,
  labels,
  tokenPlaceholder,
  requireToken,
  showActiveField = true,
}: AccountFormProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">{labels.label}</span>
        <input
          value={form.label}
          onChange={(event) => onChange({ ...form, label: event.target.value })}
          className={inputClass}
          placeholder="lmaa.space"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">
          {labels.instanceUrl}
        </span>
        <input
          value={form.instanceUrl}
          onChange={(event) => onChange({ ...form, instanceUrl: event.target.value })}
          className={inputClass}
          placeholder="https://mastodon.social"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">{labels.username}</span>
        <input
          value={form.username ?? ""}
          onChange={(event) => onChange({ ...form, username: event.target.value })}
          className={inputClass}
          placeholder="@lmaa"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">
          {requireToken ? labels.accessToken : labels.accessTokenOptional}
        </span>
        <input
          type="password"
          value={form.accessToken ?? ""}
          onChange={(event) => onChange({ ...form, accessToken: event.target.value })}
          className={inputClass}
          placeholder={tokenPlaceholder}
          autoComplete="new-password"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">{labels.visibility}</span>
        <select
          value={form.visibility}
          onChange={(event) =>
            onChange({ ...form, visibility: event.target.value as MastodonVisibility })
          }
          className={selectClass}
        >
          {VISIBILITY_OPTIONS.map((visibility) => (
            <option key={visibility} value={visibility}>
              {visibilityLabels[visibility]}
            </option>
          ))}
        </select>
      </label>
      {showActiveField && (
        <div className="flex items-end justify-between gap-3 rounded-control border border-[var(--ds-border)] px-3 py-2">
          <span className="text-sm font-medium text-[var(--ds-text)]">{labels.active}</span>
          <ToggleSwitch
            checked={form.isActive}
            onChange={(isActive) => onChange({ ...form, isActive })}
          />
        </div>
      )}
    </div>
  );
}

export function SocialMediaAccountsPage() {
  const { messages } = useI18n();
  const t = messages.socialMedia;
  const common = messages.common;
  const { data: accounts = [], isLoading } = useMastodonAccounts();
  const createAccount = useCreateMastodonAccount();
  const updateAccount = useUpdateMastodonAccount();
  const deleteAccount = useDeleteMastodonAccount();
  const [newForm, setNewForm] = useState(emptyForm);
  const [editTarget, setEditTarget] = useState<MastodonAccount | null>(null);
  const [editForm, setEditForm] = useState<MastodonAccountFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<MastodonAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCreating = createAccount.isPending;
  const isUpdating = updateAccount.isPending;

  function handleCreate() {
    setError(null);
    if (!newForm.accessToken?.trim()) {
      setError(t.tokenRequired);
      return;
    }
    createAccount.mutate(
      { ...newForm, accessToken: newForm.accessToken.trim() },
      {
        onSuccess: () => setNewForm(emptyForm()),
        onError: (err) => {
          const apiErr = err as ApiRequestError;
          if (apiErr.status === 400) {
            setError(t.tokenInvalid);
          } else if (apiErr.status === 503) {
            setError(t.instanceUnreachable);
          } else {
            setError(t.saveError);
          }
        },
      },
    );
  }

  function openEdit(account: MastodonAccount) {
    setError(null);
    setEditTarget(account);
    setEditForm(formFromAccount(account));
  }

  function handleUpdate() {
    if (!editTarget) return;
    setError(null);
    updateAccount.mutate(
      {
        id: editTarget.id,
        input: {
          ...editForm,
          accessToken: editForm.accessToken?.trim() || undefined,
        },
      },
      {
        onSuccess: () => setEditTarget(null),
        onError: (err) => {
          const apiErr = err as ApiRequestError;
          if (apiErr.status === 400) {
            setError(t.tokenInvalid);
          } else if (apiErr.status === 503) {
            setError(t.instanceUnreachable);
          } else {
            setError(t.saveError);
          }
        },
      },
    );
  }

  return (
    <PageLayout>
      <PageHeader title={t.title} />

      <PageBody className="gap-4">
        <DashboardSection>
          <DashboardSection.Header
            icon={<MastodonLogoIcon weight="duotone" className="h-4 w-4" />}
            title={t.newAccount}
            subtitle={t.mastodonHint}
            addOn={
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--ds-text-muted)]">
                  {t.fields.active}
                </span>
                <ToggleSwitch
                  checked={newForm.isActive}
                  onChange={(isActive) => setNewForm({ ...newForm, isActive })}
                />
              </div>
            }
          />
          <DashboardSection.Body>
            <AccountForm
              form={newForm}
              onChange={setNewForm}
              visibilityLabels={t.visibility}
              labels={t.fields}
              tokenPlaceholder={t.accessTokenPlaceholder}
              requireToken
              showActiveField={false}
            />
          </DashboardSection.Body>
          <DashboardSection.Footer className="justify-end">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="flex h-9 items-center gap-2 rounded-control border border-[var(--ds-btn-primary-border)] px-4 text-sm font-medium text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60"
            >
              <PlusCircleIcon weight="duotone" className="h-3.5 w-3.5" />
              {isCreating ? common.saving : t.addAccount}
            </button>
          </DashboardSection.Footer>
        </DashboardSection>

        {isLoading && (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--ds-text-muted)]">
            {common.loading}
          </div>
        )}

        {!isLoading && accounts.length === 0 && (
          <ContentUnavailableView
            chromeless
            className="min-h-64"
            icon={<MastodonLogoIcon weight="duotone" aria-hidden />}
            title={t.noAccounts}
            subtitle={t.noAccountsHint}
          />
        )}

        {!isLoading && accounts.length > 0 && (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="rounded-card border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MastodonLogoIcon
                        weight="duotone"
                        className="h-4 w-4 text-[var(--ds-text-muted)]"
                      />
                      <h2 className="truncate text-sm font-semibold text-[var(--ds-text)]">
                        {account.label}
                      </h2>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--ds-text-muted)]">
                      {account.instanceUrl}
                      {account.username ? ` · ${account.username}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      account.isActive
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]"
                    }`}
                  >
                    {account.isActive ? (
                      <CheckCircleIcon weight="duotone" className="h-3 w-3" />
                    ) : (
                      <XCircleIcon weight="duotone" className="h-3 w-3" />
                    )}
                    {account.isActive ? t.active : t.inactive}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--ds-text-muted)]">
                  <span>{t.visibility[account.visibility]}</span>
                  <span>{account.hasAccessToken ? t.tokenStored : t.tokenMissing}</span>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(account)}
                    className="h-9 rounded-control border border-[var(--ds-border)] px-3 text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]"
                  >
                    {common.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(account)}
                    className="flex h-9 items-center gap-2 rounded-control border border-[var(--ds-btn-danger-border)] px-3 text-sm text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)]"
                  >
                    <TrashIcon weight="duotone" className="h-3.5 w-3.5" />
                    {common.delete}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageBody>

      {editTarget && (
        <Dialog
          open
          title={t.editAccount}
          titleIcon={<MastodonLogoIcon weight="duotone" className={dialogHeaderIconClass} />}
          onClose={() => { setEditTarget(null); setError(null); }}
        >
          <div className="px-6 py-4">
            <AccountForm
              form={editForm}
              onChange={setEditForm}
              visibilityLabels={t.visibility}
              labels={t.fields}
              tokenPlaceholder={t.keepTokenPlaceholder}
              requireToken={false}
            />
          </div>
          <Dialog.Footer>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className={dialogBtnSecondary}
            >
              {common.cancel}
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="h-9 rounded-control border border-[var(--ds-btn-primary-border)] px-4 text-sm font-medium text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60"
            >
              {isUpdating ? common.saving : common.save}
            </button>
          </Dialog.Footer>
        </Dialog>
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
