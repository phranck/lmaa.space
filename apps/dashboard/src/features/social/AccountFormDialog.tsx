import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type React from "react";
import { useMemo, useState } from "react";

import {
  MASTODON_DEFAULT_MAX_POST_CHARACTERS,
  type MastodonVisibility,
  POSTING_PLATFORM_KEYS,
  type SocialMediaAccount,
  type SocialMediaAccountCreateInput,
  type SocialMediaAccountUpdateInput,
  type SocialMediaPlatformKey,
} from "@lmaa/contracts";
import { detectPlatformFromUrl } from "@lmaa/shared";
import type { ApiRequestError } from "@lmaa/shared";
import { PLATFORM_MAP, PLATFORMS, ToggleSwitch } from "@lmaa/ui";

import {
  CancelActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import {
  DashboardCheckboxField,
  DashboardCombobox,
  DashboardField,
  DashboardInput,
} from "@/components/ui/DashboardControls.tsx";
import { Dialog } from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  type BlueskyAccountFormInput,
  BlueskyAccountForm,
} from "@/features/social/forms/BlueskyAccountForm.tsx";
import {
  type MastodonAccountFormInput,
  MastodonAccountForm,
} from "@/features/social/forms/MastodonAccountForm.tsx";
import {
  useCreateSocialMediaAccount,
  useUpdateSocialMediaAccount,
} from "@/features/social/hooks/useSocialMediaAccounts.ts";

export type AccountFormDialogTarget =
  | { mode: "create" }
  | { mode: "edit"; account: SocialMediaAccount };

interface AccountFormDialogProps {
  target: AccountFormDialogTarget;
  onClose: () => void;
}

interface AccountFormState {
  platform: SocialMediaPlatformKey;
  label: string;
  profileUrl: string;
  showInFooter: boolean;
  canPost: boolean;
  isActive: boolean;
  mastodon: MastodonAccountFormInput;
  bluesky: BlueskyAccountFormInput;
}

const POSTING_SET = new Set<SocialMediaPlatformKey>(POSTING_PLATFORM_KEYS);

function isPostingCapable(platform: SocialMediaPlatformKey): boolean {
  return POSTING_SET.has(platform);
}

function emptyMastodon(): MastodonAccountFormInput {
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

function emptyBluesky(): BlueskyAccountFormInput {
  return { label: "", handle: "", appPassword: "", isActive: true };
}

function emptyState(): AccountFormState {
  return {
    platform: "website",
    label: "",
    profileUrl: "",
    showInFooter: true,
    canPost: false,
    isActive: true,
    mastodon: emptyMastodon(),
    bluesky: emptyBluesky(),
  };
}

function stateFromAccount(account: SocialMediaAccount): AccountFormState {
  return {
    platform: account.platform,
    label: account.label,
    profileUrl: account.profileUrl,
    showInFooter: account.showInFooter,
    canPost: account.canPost,
    isActive: account.isActive,
    mastodon: {
      label: account.label,
      instanceUrl: account.instanceUrl ?? "",
      username: account.username ?? "",
      accessToken: "",
      visibility: (account.visibility ?? "public") as MastodonVisibility,
      maxPostCharacters: account.maxPostCharacters ?? MASTODON_DEFAULT_MAX_POST_CHARACTERS,
      isActive: account.isActive,
    },
    bluesky: {
      label: account.label,
      handle: account.handle ?? "",
      appPassword: "",
      isActive: account.isActive,
    },
  };
}

function buildCreateInput(state: AccountFormState): SocialMediaAccountCreateInput {
  const base = {
    platform: state.platform,
    label: state.label.trim(),
    profileUrl: state.profileUrl.trim(),
    canPost: state.canPost,
    showInFooter: state.showInFooter,
    isActive: state.isActive,
  } as SocialMediaAccountCreateInput;
  if (!state.canPost) return base;
  if (state.platform === "mastodon") {
    return {
      ...base,
      instanceUrl: state.mastodon.instanceUrl.trim(),
      username: state.mastodon.username?.trim() || undefined,
      accessToken: state.mastodon.accessToken?.trim() || undefined,
      visibility: state.mastodon.visibility,
      maxPostCharacters: state.mastodon.maxPostCharacters,
    };
  }
  if (state.platform === "bluesky") {
    return {
      ...base,
      handle: state.bluesky.handle.trim(),
      appPassword: state.bluesky.appPassword.trim() || undefined,
    };
  }
  return base;
}

function buildUpdateInput(state: AccountFormState): SocialMediaAccountUpdateInput {
  const base: SocialMediaAccountUpdateInput = {
    platform: state.platform,
    label: state.label.trim(),
    profileUrl: state.profileUrl.trim(),
    canPost: state.canPost,
    showInFooter: state.showInFooter,
    isActive: state.isActive,
  };
  if (!state.canPost) return base;
  if (state.platform === "mastodon") {
    return {
      ...base,
      instanceUrl: state.mastodon.instanceUrl.trim(),
      username: state.mastodon.username?.trim() || undefined,
      accessToken: state.mastodon.accessToken?.trim() || undefined,
      visibility: state.mastodon.visibility,
      maxPostCharacters: state.mastodon.maxPostCharacters,
    };
  }
  if (state.platform === "bluesky") {
    return {
      ...base,
      handle: state.bluesky.handle.trim(),
      appPassword: state.bluesky.appPassword.trim() || undefined,
    };
  }
  return base;
}

export function AccountFormDialog({
  target,
  onClose,
}: AccountFormDialogProps): React.ReactElement {
  const { messages } = useI18n();
  const t = messages.socialMedia;
  const common = messages.common;
  const isCreate = target.mode === "create";

  const [state, setState] = useState<AccountFormState>(() =>
    target.mode === "edit" ? stateFromAccount(target.account) : emptyState(),
  );
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSocialMediaAccount();
  const updateMutation = useUpdateSocialMediaAccount();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const platformDef = useMemo(
    () => PLATFORM_MAP.get(state.platform),
    [state.platform],
  );
  const platformOptions = useMemo(
    () =>
      PLATFORMS.map((platform) => {
        const Icon = platform.icon;
        return {
          label: platform.label,
          leadingIcon: <Icon size={18} />,
          triggerLabel: "",
          value: platform.key,
        };
      }),
    [],
  );
  const PlatformIcon = platformDef?.icon;

  const canPostAvailable = isPostingCapable(state.platform);

  const dialogTitle = isCreate ? t.addAccountTitle : t.editAccount;
  const dialogIcon = PlatformIcon ? (
    <span className="shrink-0 text-[var(--ds-text-muted)]">
      <PlatformIcon size={24} />
    </span>
  ) : undefined;

  function applyUrlAutoDetect(url: string): void {
    const trimmed = url.trim();
    if (!trimmed) return;
    const detected = detectPlatformFromUrl(trimmed);
    if (!detected) return;
    setState((prev) => {
      if (prev.platform !== "website" && prev.platform === detected) return prev;
      return { ...prev, platform: detected as SocialMediaPlatformKey };
    });
  }

  function handleProfileUrlBlur(): void {
    if (!state.profileUrl) return;
    applyUrlAutoDetect(state.profileUrl);
  }

  function handleProfileUrlPaste(event: React.ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData.getData("text");
    if (pasted) applyUrlAutoDetect(pasted);
  }

  function pickPlatform(key: SocialMediaPlatformKey): void {
    setState((prev) => {
      const next = { ...prev, platform: key };
      if (!isPostingCapable(key)) {
        next.canPost = false;
      }
      return next;
    });
  }

  function mapError(err: unknown): string {
    const apiErr = err as ApiRequestError;
    if (apiErr.status === 409) {
      return t.conflictForPlatform.replace("{platform}", platformDef?.label ?? state.platform);
    }
    if (apiErr.status === 400) return apiErr.message ?? t.saveError;
    if (apiErr.status === 503) return apiErr.message ?? t.instanceUnreachable;
    return t.saveError;
  }

  function handleSave(): void {
    setError(null);
    if (!state.label.trim()) {
      setError(t.labelRequired);
      return;
    }
    if (!state.profileUrl.trim()) {
      setError(t.profileUrlRequired);
      return;
    }
    if (isCreate) {
      createMutation.mutate(buildCreateInput(state), {
        onSuccess: () => onClose(),
        onError: (err) => setError(mapError(err)),
      });
    } else if (target.mode === "edit") {
      updateMutation.mutate(
        { id: target.account.id, input: buildUpdateInput(state) },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(mapError(err)),
        },
      );
    }
  }

  const headerExtra = (
    <label className="inline-flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
      <span className={state.canPost ? "" : "opacity-50"}>{t.fields.active}</span>
      <ToggleSwitch
        checked={state.isActive}
        disabled={!state.canPost}
        onChange={(value) => setState((prev) => ({ ...prev, isActive: value }))}
      />
    </label>
  );

  return (
    <Dialog
      open
      title={dialogTitle}
      titleIcon={dialogIcon}
      headerExtra={headerExtra}
      onClose={onClose}
      maxWidth="lg"
    >
      <div className="space-y-5 px-6 py-4">
        <DashboardInput
          label={t.fields.label}
          value={state.label}
          onChange={(event) => setState((prev) => ({ ...prev, label: event.target.value }))}
          placeholder="lmaa.space"
        />

        <DashboardField label={t.profileUrlLabel}>
          {(controlProps) => (
            <div className="flex items-stretch gap-2">
              <DashboardCombobox
                aria-label={t.platformPickerLabel}
                className="w-12 px-2"
                matchTriggerWidth={false}
                onValueChange={(value) => pickPlatform(value as SocialMediaPlatformKey)}
                options={platformOptions}
                portal
                value={state.platform}
              />
              <DashboardInput
                {...controlProps}
                value={state.profileUrl}
                onChange={(event) =>
                  setState((prev) => ({ ...prev, profileUrl: event.target.value }))
                }
                onBlur={handleProfileUrlBlur}
                onPaste={handleProfileUrlPaste}
                className="flex-1"
                placeholder="https://..."
              />
              {state.profileUrl && (
                <a
                  href={state.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-[var(--ds-control-h-field)] items-center justify-center rounded-control border border-[var(--ds-border-subtle)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
                  aria-label={t.openLink}
                >
                  <ArrowSquareOutIcon weight="bold" className="size-4" />
                </a>
              )}
            </div>
          )}
        </DashboardField>

        <div className="flex flex-row flex-wrap items-center gap-6">
          <DashboardCheckboxField
            checked={state.showInFooter}
            label={t.showInFooter}
            onCheckedChange={(checked) =>
              setState((prev) => ({ ...prev, showInFooter: checked }))
            }
          />
          <DashboardCheckboxField
            checked={state.canPost}
            className={canPostAvailable ? undefined : "opacity-60"}
            disabled={!canPostAvailable}
            label={t.useForPosting}
            onCheckedChange={(checked) =>
              setState((prev) => ({
                ...prev,
                canPost: checked,
                isActive: checked ? prev.isActive : true,
              }))
            }
            title={canPostAvailable ? undefined : t.postingPlatformOnly}
          />
        </div>

        {state.canPost && state.platform === "mastodon" && (
          <div className="border-t border-[var(--ds-border-subtle)] pt-4">
            <MastodonAccountForm
              form={{ ...state.mastodon, label: state.label }}
              onChange={(form) =>
                setState((prev) => ({
                  ...prev,
                  mastodon: { ...form, label: prev.label },
                }))
              }
              visibilityLabels={t.visibility}
              labels={{ ...t.fields, maxPostCharacters: t.mastodonMaxPostCharactersLabel }}
              tokenPlaceholder={isCreate ? t.accessTokenPlaceholder : t.keepTokenPlaceholder}
              requireToken={isCreate}
            />
          </div>
        )}

        {state.canPost && state.platform === "bluesky" && (
          <div className="border-t border-[var(--ds-border-subtle)] pt-4">
            <BlueskyAccountForm
              form={{ ...state.bluesky, label: state.label }}
              onChange={(form) =>
                setState((prev) => ({
                  ...prev,
                  bluesky: { ...form, label: prev.label },
                }))
              }
              labels={{
                handle: t.bluesky.handleLabel,
                appPassword: t.bluesky.appPasswordLabel,
                appPasswordKeepHint: t.bluesky.appPasswordKeepHint,
                appPasswordRecommendation: t.bluesky.appPasswordRecommendation,
                appPasswordSettingsLink: t.bluesky.appPasswordSettingsLink,
              }}
              requirePassword={isCreate}
              hasStoredPassword={
                target.mode === "edit" ? target.account.hasAccessToken : false
              }
            />
          </div>
        )}
      </div>
      <Dialog.Footer>
        {error && <p className="mr-auto text-xs text-red-500">{error}</p>}
        <CancelActionButton label={common.cancel} onClick={onClose} />
        <SaveActionButton
          disabled={isSaving}
          label={isSaving ? common.saving : common.save}
          onClick={handleSave}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
