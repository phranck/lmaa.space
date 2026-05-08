import { ArrowLeftIcon } from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";

import {
  type BlueskyAccount,
  MASTODON_DEFAULT_MAX_POST_CHARACTERS,
  type MastodonAccount,
} from "@lmaa/contracts";
import type { ApiRequestError } from "@lmaa/shared";
import { PLATFORM_MAP, ToggleSwitch } from "@lmaa/ui";

import {
  Dialog,
  dialogBtnPrimary,
  dialogBtnSecondary,
} from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  type BlueskyAccountFormInput,
  BlueskyAccountForm,
} from "@/features/social/forms/BlueskyAccountForm.tsx";
import { MastodonAccountForm } from "@/features/social/forms/MastodonAccountForm.tsx";
import {
  useCreateBlueskyAccount,
  useUpdateBlueskyAccount,
} from "@/features/social/hooks/useBlueskyAccount.ts";
import {
  type MastodonAccountFormInput,
  useCreateMastodonAccount,
  useUpdateMastodonAccount,
} from "@/features/social/hooks/useMastodonAccount.ts";
import {
  type ServiceId,
  SUPPORTED_PLATFORMS,
} from "@/features/social/services.ts";

export type AccountFormDialogTarget =
  | { mode: "create" }
  | { mode: "edit"; platform: "mastodon"; account: MastodonAccount }
  | { mode: "edit"; platform: "bluesky"; account: BlueskyAccount };

interface AccountFormDialogProps {
  target: AccountFormDialogTarget;
  existingMastodon: boolean;
  existingBluesky: boolean;
  onClose: () => void;
}

function emptyMastodonForm(): MastodonAccountFormInput {
  return {
    label: "",
    instanceUrl: "",
    username: "",
    accessToken: "",
    visibility: "public",
    maxPostCharacters: MASTODON_DEFAULT_MAX_POST_CHARACTERS,
    isActive: true,
  };
}

function mastodonFormFromAccount(account: MastodonAccount): MastodonAccountFormInput {
  return {
    label: account.label,
    instanceUrl: account.instanceUrl,
    username: account.username ?? "",
    accessToken: "",
    visibility: account.visibility,
    maxPostCharacters: account.maxPostCharacters,
    isActive: account.isActive,
  };
}

function emptyBlueskyForm(): BlueskyAccountFormInput {
  return { label: "", handle: "", appPassword: "", isActive: true };
}

function blueskyFormFromAccount(account: BlueskyAccount): BlueskyAccountFormInput {
  return {
    label: account.label,
    handle: account.handle,
    appPassword: "",
    isActive: account.isActive,
  };
}

export function AccountFormDialog({
  target,
  existingMastodon,
  existingBluesky,
  onClose,
}: AccountFormDialogProps): React.ReactElement {
  const { messages } = useI18n();
  const t = messages.socialMedia;
  const common = messages.common;

  const isCreate = target.mode === "create";

  const [pickedService, setPickedService] = useState<ServiceId | null>(
    target.mode === "edit" ? target.platform : null,
  );

  const [mastodonForm, setMastodonForm] = useState<MastodonAccountFormInput>(() =>
    target.mode === "edit" && target.platform === "mastodon"
      ? mastodonFormFromAccount(target.account)
      : emptyMastodonForm(),
  );

  const [blueskyForm, setBlueskyForm] = useState<BlueskyAccountFormInput>(() =>
    target.mode === "edit" && target.platform === "bluesky"
      ? blueskyFormFromAccount(target.account)
      : emptyBlueskyForm(),
  );

  const [error, setError] = useState<string | null>(null);

  const createMastodon = useCreateMastodonAccount();
  const updateMastodon = useUpdateMastodonAccount();
  const createBluesky = useCreateBlueskyAccount();
  const updateBluesky = useUpdateBlueskyAccount();

  const isSaving =
    createMastodon.isPending ||
    updateMastodon.isPending ||
    createBluesky.isPending ||
    updateBluesky.isPending;

  function handleBack(): void {
    setPickedService(null);
    setError(null);
    setMastodonForm(emptyMastodonForm());
    setBlueskyForm(emptyBlueskyForm());
  }

  function mapMastodonError(err: unknown): string {
    const apiErr = err as ApiRequestError;
    if (apiErr.status === 409) return t.bluesky.conflictError;
    if (apiErr.status === 400) return t.tokenInvalid;
    if (apiErr.status === 503) return t.instanceUnreachable;
    return t.saveError;
  }

  function mapBlueskyError(err: unknown): string {
    const apiErr = err as ApiRequestError;
    if (apiErr.status === 409) return t.bluesky.conflictError;
    if (apiErr.status === 400) return t.bluesky.invalidCredentialsError;
    if (apiErr.status === 503) return t.bluesky.serviceUnreachableError;
    return t.saveError;
  }

  function handleSaveMastodon(): void {
    setError(null);
    if (isCreate) {
      if (!mastodonForm.accessToken?.trim()) {
        setError(t.tokenRequired);
        return;
      }
      createMastodon.mutate(
        { ...mastodonForm, accessToken: mastodonForm.accessToken.trim() },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(mapMastodonError(err)),
        },
      );
    } else if (target.mode === "edit" && target.platform === "mastodon") {
      updateMastodon.mutate(
        {
          id: target.account.id,
          input: {
            ...mastodonForm,
            accessToken: mastodonForm.accessToken?.trim() || undefined,
          },
        },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(mapMastodonError(err)),
        },
      );
    }
  }

  function handleSaveBluesky(): void {
    setError(null);
    if (isCreate) {
      if (!blueskyForm.appPassword.trim()) {
        setError(t.bluesky.invalidCredentialsError);
        return;
      }
      createBluesky.mutate(
        { ...blueskyForm, appPassword: blueskyForm.appPassword.trim() },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(mapBlueskyError(err)),
        },
      );
    } else if (target.mode === "edit" && target.platform === "bluesky") {
      updateBluesky.mutate(
        {
          id: target.account.id,
          input: {
            ...blueskyForm,
            appPassword: blueskyForm.appPassword.trim() || undefined,
          },
        },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(mapBlueskyError(err)),
        },
      );
    }
  }

  function handleSave(): void {
    if (pickedService === "mastodon") handleSaveMastodon();
    else if (pickedService === "bluesky") handleSaveBluesky();
  }

  const dialogTitle = (() => {
    if (target.mode === "edit") {
      return target.platform === "bluesky" ? t.bluesky.sectionTitle : t.editAccount;
    }
    if (!pickedService) return t.addAccountTitle;
    return pickedService === "bluesky" ? t.bluesky.addAccount : t.addMastodonAccount;
  })();

  const activePlatform = pickedService ? PLATFORM_MAP.get(pickedService) : undefined;
  const dialogIcon = activePlatform ? (
    <span className="shrink-0 text-[var(--ds-text-muted)]">
      <activePlatform.icon size={24} />
    </span>
  ) : undefined;

  if (isCreate && !pickedService) {
    return (
      <Dialog open title={dialogTitle} titleIcon={dialogIcon} onClose={onClose} maxWidth="lg">
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
            {t.pickService}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {SUPPORTED_PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isTaken =
                (platform.key === "mastodon" && existingMastodon) ||
                (platform.key === "bluesky" && existingBluesky);
              return (
                <button
                  key={platform.key}
                  type="button"
                  disabled={isTaken}
                  onClick={() => setPickedService(platform.key as ServiceId)}
                  className={`border rounded-card p-6 flex flex-col items-center gap-3 transition-colors ${
                    isTaken
                      ? "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] opacity-50 cursor-not-allowed"
                      : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-hover)]"
                  }`}
                >
                  <Icon size={32} />
                  <span className="text-sm font-medium text-[var(--ds-text)]">
                    {platform.label}
                  </span>
                  {isTaken && (
                    <span className="text-xs text-[var(--ds-text-muted)]">
                      {t.alreadyConfigured}
                    </span>
                  )}
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

  const editingBluesky =
    pickedService === "bluesky" || (target.mode === "edit" && target.platform === "bluesky");
  const activeIsActive = editingBluesky ? blueskyForm.isActive : mastodonForm.isActive;
  const setActiveIsActive = (isActive: boolean) => {
    if (editingBluesky) setBlueskyForm({ ...blueskyForm, isActive });
    else setMastodonForm({ ...mastodonForm, isActive });
  };

  return (
    <Dialog open title={dialogTitle} titleIcon={dialogIcon} onClose={onClose} maxWidth="lg">
      <div className="flex items-center gap-3 px-6 pt-3">
        {isCreate && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
          >
            <ArrowLeftIcon weight="bold" className="w-3 h-3" />
            {t.changeService}
          </button>
        )}
        <label className="ml-auto inline-flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
          <span>{t.fields.active}</span>
          <ToggleSwitch checked={activeIsActive} onChange={setActiveIsActive} />
        </label>
      </div>
      <div className="px-6 py-4">
        {editingBluesky ? (
          <BlueskyAccountForm
            form={blueskyForm}
            onChange={setBlueskyForm}
            labels={{
              label: t.fields.label,
              handle: t.bluesky.handleLabel,
              appPassword: t.bluesky.appPasswordLabel,
              appPasswordKeepHint: t.bluesky.appPasswordKeepHint,
              appPasswordRecommendation: t.bluesky.appPasswordRecommendation,
              appPasswordSettingsLink: t.bluesky.appPasswordSettingsLink,
            }}
            requirePassword={isCreate}
            hasStoredPassword={
              target.mode === "edit" &&
              target.platform === "bluesky" &&
              target.account.hasAccessToken
            }
          />
        ) : (
          <MastodonAccountForm
            form={mastodonForm}
            onChange={setMastodonForm}
            visibilityLabels={t.visibility}
            labels={{ ...t.fields, maxPostCharacters: t.mastodonMaxPostCharactersLabel }}
            tokenPlaceholder={isCreate ? t.accessTokenPlaceholder : t.keepTokenPlaceholder}
            requireToken={isCreate}
          />
        )}
      </div>
      <Dialog.Footer>
        {error && <p className="mr-auto text-xs text-red-500">{error}</p>}
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
