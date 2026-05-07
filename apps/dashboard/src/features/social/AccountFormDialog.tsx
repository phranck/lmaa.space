import { ArrowLeftIcon } from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";

import type { MastodonAccount } from "@lmaa/contracts";
import type { ApiRequestError } from "@lmaa/shared";
import { PLATFORM_MAP } from "@lmaa/ui";

import {
  Dialog,
  dialogBtnPrimary,
  dialogBtnSecondary,
} from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { MastodonAccountForm } from "@/features/social/forms/MastodonAccountForm.tsx";
import {
  type MastodonAccountFormInput,
  useCreateMastodonAccount,
  useUpdateMastodonAccount,
} from "@/features/social/hooks/useMastodonAccounts.ts";
import {
  type ServiceId,
  SUPPORTED_PLATFORMS,
} from "@/features/social/services.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

type DialogMode =
  | { mode: "create" }
  | { mode: "edit"; account: MastodonAccount };

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface AccountFormDialogProps {
  target: DialogMode;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Unified create/edit dialog for social media accounts.
 *
 * Create mode: Stage A shows a service-card picker; clicking a card advances
 * to Stage B (the service form). A back link returns to Stage A.
 *
 * Edit mode: opens directly on Stage B (service inferred as Mastodon until
 * multi-service support is added).
 */
export function AccountFormDialog({ target, onClose }: AccountFormDialogProps): React.ReactElement {
  const { messages } = useI18n();
  const t = messages.socialMedia;
  const common = messages.common;

  const isCreate = target.mode === "create";

  // In edit mode we go straight to the form — no picker stage.
  const [pickedService, setPickedService] = useState<ServiceId | null>(
    isCreate ? null : "mastodon",
  );

  const [form, setForm] = useState<MastodonAccountFormInput>(
    isCreate ? emptyForm() : formFromAccount((target as { mode: "edit"; account: MastodonAccount }).account),
  );

  const [error, setError] = useState<string | null>(null);

  const createAccount = useCreateMastodonAccount();
  const updateAccount = useUpdateMastodonAccount();

  const isSaving = createAccount.isPending || updateAccount.isPending;

  function handleBack(): void {
    setPickedService(null);
    setError(null);
    setForm(emptyForm());
  }

  function mapError(err: unknown): string {
    const apiErr = err as ApiRequestError;
    if (apiErr.status === 400) return t.tokenInvalid;
    if (apiErr.status === 503) return t.instanceUnreachable;
    return t.saveError;
  }

  function handleSave(): void {
    setError(null);

    if (isCreate) {
      if (!form.accessToken?.trim()) {
        setError(t.tokenRequired);
        return;
      }
      createAccount.mutate(
        { ...form, accessToken: form.accessToken.trim() },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(mapError(err)),
        },
      );
    } else {
      const editTarget = (target as { mode: "edit"; account: MastodonAccount }).account;
      updateAccount.mutate(
        {
          id: editTarget.id,
          input: {
            ...form,
            accessToken: form.accessToken?.trim() || undefined,
          },
        },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(mapError(err)),
        },
      );
    }
  }

  // ─── Dialog title / icon ──────────────────────────────────────────────────

  const dialogTitle = (() => {
    if (!isCreate) return t.editAccount;
    if (!pickedService) return t.addAccountTitle;
    return t.addMastodonAccount;
  })();

  const activePlatform = pickedService ? PLATFORM_MAP.get(pickedService) : undefined;
  const dialogIcon = activePlatform ? (
    <span className="shrink-0 text-[var(--ds-text-muted)]">
      <activePlatform.icon size={24} />
    </span>
  ) : undefined;

  // ─── Stage A — service picker ─────────────────────────────────────────────

  if (isCreate && !pickedService) {
    return (
      <Dialog open title={dialogTitle} titleIcon={dialogIcon} onClose={onClose} maxWidth="md">
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
            {t.pickService}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {SUPPORTED_PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              return (
                <button
                  key={platform.key}
                  type="button"
                  onClick={() => setPickedService(platform.key as ServiceId)}
                  className="border border-[var(--ds-border-subtle)] rounded-card bg-[var(--ds-surface)] p-6 flex flex-col items-center gap-3 hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-hover)] transition-colors"
                >
                  <Icon size={32} />
                  <span className="text-sm font-medium text-[var(--ds-text)]">
                    {platform.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Dialog.Footer>
          <button type="button" onClick={onClose} className={dialogBtnSecondary}>
            {common.cancel}
          </button>
        </Dialog.Footer>
      </Dialog>
    );
  }

  // ─── Stage B — service form ───────────────────────────────────────────────

  return (
    <Dialog open title={dialogTitle} titleIcon={dialogIcon} onClose={onClose} maxWidth="md">
      {isCreate && (
        <div className="px-6 pt-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
          >
            <ArrowLeftIcon weight="bold" className="w-3 h-3" />
            {t.changeService}
          </button>
        </div>
      )}
      <div className="px-6 py-4">
        <MastodonAccountForm
          form={form}
          onChange={setForm}
          visibilityLabels={t.visibility}
          labels={t.fields}
          tokenPlaceholder={isCreate ? t.accessTokenPlaceholder : t.keepTokenPlaceholder}
          requireToken={isCreate}
        />
      </div>
      <Dialog.Footer>
        {error && (
          <p className="mr-auto text-xs text-red-500">{error}</p>
        )}
        <button type="button" onClick={onClose} className={dialogBtnSecondary}>
          {common.cancel}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={dialogBtnPrimary}
        >
          {isSaving ? common.saving : common.save}
        </button>
      </Dialog.Footer>
    </Dialog>
  );
}
