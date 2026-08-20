import { LinkIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { memo, useCallback, useMemo, useReducer } from "react";

import {
  normalizeRedirectUrlName,
  redirectUrlEntrySchema,
  redirectUrlsConfigSchema,
  type RedirectUrlEntry,
  type RedirectUrlsConfig,
} from "@lmaa/contracts";
import { SETTINGS_KEYS } from "@lmaa/shared";

import { Badge } from "@/components/ui/Badge.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  CopyActionButton,
  CreateActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput, DashboardSwitchField } from "@/components/ui/DashboardControls.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { parseRedirectUrlsConfig } from "@/features/system/redirect-urls-config.ts";
import { FRONTEND_URL } from "@/lib/env.ts";

import { useSaveSystemSetting, useSystemSettings } from "./settings/hooks/useSystemSettings.ts";

type RedirectUrlDialogTarget =
  | { mode: "create"; redirect: RedirectUrlEntry }
  | { mode: "edit"; redirect: RedirectUrlEntry };

interface RedirectUrlsState {
  sourceRaw: string | undefined;
  redirects: RedirectUrlEntry[];
  dialogTarget: RedirectUrlDialogTarget | null;
  showValidationError: boolean;
  saveError: string | null;
  savingDialog: boolean;
  deletingRedirectId: string | null;
}

type RedirectUrlsAction = Partial<RedirectUrlsState>;

function redirectUrlsReducer(
  state: RedirectUrlsState,
  action: RedirectUrlsAction,
): RedirectUrlsState {
  return { ...state, ...action };
}

function serializeConfig(config: RedirectUrlsConfig): string {
  return JSON.stringify(config);
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyRedirect(name: string): RedirectUrlEntry {
  return {
    id: createId(),
    name: normalizeRedirectUrlName(name),
    targetUrl: "",
    openInNewWindow: false,
    isActive: true,
  };
}

function publicRedirectUrl(name: string): string {
  return `${FRONTEND_URL.replace(/\/+$/, "")}/r/${encodeURIComponent(name)}`;
}

function getRedirectErrors(
  redirect: RedirectUrlEntry,
  redirects: RedirectUrlEntry[],
  messages: ReturnType<typeof useI18n>["messages"]["system"]["redirectUrls"],
) {
  const parsed = redirectUrlEntrySchema.safeParse(redirect);
  const paths = parsed.success
    ? new Set<string>()
    : new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
  const hasDuplicateName = redirects.some(
    (entry) => entry.id !== redirect.id && entry.name === redirect.name,
  );

  return {
    name: hasDuplicateName
      ? messages.nameDuplicate
      : paths.has("name")
        ? messages.nameRequired
        : null,
    targetUrl: paths.has("targetUrl") ? messages.targetUrlInvalid : null,
  };
}

interface RedirectUrlDialogProps {
  target: RedirectUrlDialogTarget;
  redirects: RedirectUrlEntry[];
  onClose: () => void;
  onSave: (target: RedirectUrlDialogTarget) => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
}

interface RedirectUrlDialogState {
  draft: RedirectUrlEntry;
  showValidationError: boolean;
}

function redirectUrlDialogReducer(
  state: RedirectUrlDialogState,
  action: Partial<RedirectUrlDialogState>,
): RedirectUrlDialogState {
  return { ...state, ...action };
}

function RedirectUrlDialog({
  target,
  redirects,
  onClose,
  onSave,
  isSaving,
  saveError,
}: RedirectUrlDialogProps) {
  const { messages } = useI18n();
  const t = messages.system.redirectUrls;
  const common = messages.common;
  const [{ draft, showValidationError }, dispatchDialog] = useReducer(redirectUrlDialogReducer, {
    draft: target.redirect,
    showValidationError: false,
  });

  const errors = getRedirectErrors(draft, redirects, t);
  const displayName = draft.name.trim() || t.defaultName;
  const titleTemplate = target.mode === "create" ? t.dialogCreateTitle : t.dialogEditTitle;
  const title = titleTemplate.replace("{name}", displayName);
  const resolvedPublicUrl = draft.name ? publicRedirectUrl(draft.name) : "";

  function updateDraft(patch: Partial<RedirectUrlEntry>) {
    dispatchDialog({ draft: { ...draft, ...patch } });
  }

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    const parsed = redirectUrlEntrySchema.safeParse(draft);
    if (!parsed.success || errors.name || errors.targetUrl) {
      dispatchDialog({ showValidationError: true });
      return;
    }

    const nextTarget = { ...target, redirect: parsed.data } as RedirectUrlDialogTarget;
    const saved = await onSave(nextTarget);
    if (saved) onClose();
  }, [draft, errors.name, errors.targetUrl, isSaving, onClose, onSave, target]);

  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{ storageKey: "system:redirect-url-editor", defaultWidth: 680, minWidth: 520 }}
      aria-label={title}
    >
      <OverlayCard.Header>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <LinkIcon weight="duotone" className={dialogHeaderIconClass} />
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-[var(--ds-text)]">{title}</h3>
            </div>
          </div>
          <DashboardSwitchField
            checked={draft.isActive}
            onCheckedChange={(checked) => updateDraft({ isActive: checked })}
            aria-label={t.enabledLabel}
            label={t.enabledLabel}
          />
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body className="flex flex-col gap-5">
        {showValidationError ? (
          <div className="rounded-card border border-[var(--ds-warning-border)] bg-[var(--ds-warning-bg)] px-4 py-3 text-sm text-[var(--ds-warning-text)]">
            {t.validationError}
          </div>
        ) : null}

        {saveError ? (
          <div className="rounded-card border border-[var(--ds-danger-border)] bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger-text)]">
            {saveError}
          </div>
        ) : null}

        <DashboardInput
          label={t.nameLabel}
          hint={t.nameHint}
          error={showValidationError ? errors.name : null}
          value={draft.name}
          onChange={(event) =>
            updateDraft({ name: normalizeRedirectUrlName(event.currentTarget.value) })
          }
        />

        <DashboardInput
          label={t.targetUrlLabel}
          hint={t.targetUrlHint}
          error={showValidationError ? errors.targetUrl : null}
          value={draft.targetUrl}
          onChange={(event) => updateDraft({ targetUrl: event.currentTarget.value.trim() })}
        />

        <DashboardInput label={t.publicUrlLabel} readOnly value={resolvedPublicUrl} />

        <DashboardSwitchField
          checked={draft.openInNewWindow}
          onCheckedChange={(checked) => updateDraft({ openInNewWindow: checked })}
          aria-label={t.openInNewWindowLabel}
          label={t.openInNewWindowLabel}
          description={t.openInNewWindowDescription}
        />
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <CancelActionButton label={common.cancel} onClick={onClose} disabled={isSaving} />
        <SaveActionButton
          onClick={() => void handleSave()}
          disabled={isSaving}
          busy={isSaving}
          label={
            isSaving ? common.saving : target.mode === "create" ? t.createRedirect : t.saveRedirect
          }
        />
      </OverlayCard.Footer>
    </OverlayCard>
  );
}

export const RedirectUrlsPage = memo(function RedirectUrlsPage() {
  const { messages } = useI18n();
  const t = messages.system.redirectUrls;
  const common = messages.common;
  const { data: settings } = useSystemSettings();
  const saveSetting = useSaveSystemSetting();
  const rawRedirectUrlsSetting = settings?.[SETTINGS_KEYS.REDIRECT_URLS];

  const initialConfig = useMemo(
    () => parseRedirectUrlsConfig(rawRedirectUrlsSetting),
    [rawRedirectUrlsSetting],
  );
  const [state, dispatch] = useReducer(redirectUrlsReducer, {
    sourceRaw: rawRedirectUrlsSetting,
    redirects: initialConfig.redirects,
    dialogTarget: null,
    showValidationError: false,
    saveError: null,
    savingDialog: false,
    deletingRedirectId: null,
  });
  const {
    redirects,
    dialogTarget,
    showValidationError,
    saveError,
    savingDialog,
    deletingRedirectId,
  } = state;

  if (state.sourceRaw !== rawRedirectUrlsSetting) {
    dispatch({
      sourceRaw: rawRedirectUrlsSetting,
      redirects: initialConfig.redirects,
      dialogTarget: null,
      showValidationError: false,
      saveError: null,
    });
  }

  const persistRedirects = useCallback(
    async (nextRedirects: RedirectUrlEntry[]) => {
      const parsed = redirectUrlsConfigSchema.safeParse({ redirects: nextRedirects });
      const hasDuplicateName =
        new Set(nextRedirects.map((redirect) => redirect.name)).size !== nextRedirects.length;
      if (!parsed.success || hasDuplicateName) {
        dispatch({ showValidationError: true });
        return false;
      }

      try {
        await saveSetting.mutateAsync({
          key: SETTINGS_KEYS.REDIRECT_URLS,
          value: serializeConfig(parsed.data),
        });
        dispatch({
          redirects: parsed.data.redirects,
          showValidationError: false,
          saveError: null,
        });
        return true;
      } catch {
        dispatch({ saveError: t.saveError });
        return false;
      }
    },
    [saveSetting, t.saveError],
  );

  const handleAddRedirect = useCallback(() => {
    dispatch({
      dialogTarget: { mode: "create", redirect: createEmptyRedirect(t.defaultName) },
      showValidationError: false,
      saveError: null,
    });
  }, [t.defaultName]);

  const handleSaveRedirect = useCallback(
    async (target: RedirectUrlDialogTarget) => {
      const parsed = redirectUrlEntrySchema.safeParse(target.redirect);
      if (!parsed.success) return false;
      const hasDuplicateName = redirects.some(
        (redirect) => redirect.id !== parsed.data.id && redirect.name === parsed.data.name,
      );
      if (hasDuplicateName) return false;

      const nextRedirects =
        target.mode === "create"
          ? [...redirects, parsed.data]
          : redirects.map((redirect) => (redirect.id === parsed.data.id ? parsed.data : redirect));

      dispatch({ savingDialog: true });
      try {
        return await persistRedirects(nextRedirects);
      } finally {
        dispatch({ savingDialog: false });
      }
    },
    [persistRedirects, redirects],
  );

  const handleDeleteRedirect = useCallback(
    async (id: string) => {
      const nextRedirects = redirects.filter((redirect) => redirect.id !== id);
      dispatch({ deletingRedirectId: id });
      try {
        const saved = await persistRedirects(nextRedirects);
        if (saved) {
          dispatch({
            dialogTarget: dialogTarget?.redirect.id === id ? null : dialogTarget,
          });
        }
      } finally {
        dispatch({ deletingRedirectId: null });
      }
    },
    [dialogTarget, persistRedirects, redirects],
  );

  const columns: ColumnDef<RedirectUrlEntry>[] = useMemo(
    () => [
      {
        id: "name",
        header: t.tableColumnName,
        sortKey: (row) => row.name,
        cell: (row) => <span className="font-mono text-xs text-[var(--ds-text)]">{row.name}</span>,
      },
      {
        id: "publicUrl",
        header: t.tableColumnPublicUrl,
        cell: (row) => (
          <span
            className="block max-w-[24rem] truncate font-mono text-xs text-[var(--ds-text-muted)]"
            title={publicRedirectUrl(row.name)}
          >
            {publicRedirectUrl(row.name)}
          </span>
        ),
      },
      {
        id: "targetUrl",
        header: t.tableColumnTargetUrl,
        cell: (row) => (
          <span
            className="block max-w-[28rem] truncate text-xs text-[var(--ds-text-muted)]"
            title={row.targetUrl}
          >
            {row.targetUrl}
          </span>
        ),
      },
      {
        id: "window",
        header: t.tableColumnWindow,
        cell: (row) => (
          <span className="text-xs text-[var(--ds-text-muted)]">
            {row.openInNewWindow ? t.newWindow : t.sameWindow}
          </span>
        ),
      },
      {
        id: "status",
        header: t.tableColumnStatus,
        cell: (row) => (
          <Badge
            colorClass={
              row.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-stone-500/10 text-stone-400"
            }
          >
            {row.isActive ? t.active : t.inactive}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t.tableColumnActions,
        cellClassName: "text-right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <CopyActionButton
              iconOnly
              label={t.copyPublicUrl}
              onClick={() => void navigator.clipboard?.writeText(publicRedirectUrl(row.name))}
              disabled={savingDialog || deletingRedirectId !== null}
            />
            <TableActionButton
              variant="neutral"
              icon={<PencilSimpleIcon weight="duotone" className="size-3.5" />}
              label={t.editRedirect}
              onClick={() => {
                dispatch({ saveError: null, dialogTarget: { mode: "edit", redirect: { ...row } } });
              }}
              disabled={savingDialog || deletingRedirectId !== null}
            />
            <TableActionButton
              variant="danger"
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
              label={deletingRedirectId === row.id ? common.saving : t.deleteRedirect}
              onClick={() => void handleDeleteRedirect(row.id)}
              disabled={savingDialog || deletingRedirectId !== null}
            />
          </div>
        ),
      },
    ],
    [common.saving, deletingRedirectId, handleDeleteRedirect, savingDialog, t],
  );

  return (
    <PageLayout>
      <PageHeader title={t.title} />

      <PageBody>
        {showValidationError ? (
          <div className="rounded-card border border-[var(--ds-warning-border)] bg-[var(--ds-warning-bg)] px-4 py-3 text-sm text-[var(--ds-warning-text)]">
            {t.validationError}
          </div>
        ) : null}

        {saveError && !dialogTarget ? (
          <div className="rounded-card border border-[var(--ds-danger-border)] bg-[var(--ds-danger-bg)] px-4 py-3 text-sm text-[var(--ds-danger-text)]">
            {saveError}
          </div>
        ) : null}

        {redirects.length === 0 ? (
          <ContentUnavailableView
            chromeless
            className="flex-1 min-h-0"
            icon={<LinkIcon weight="duotone" aria-hidden />}
            title={t.emptyTitle}
            subtitle={t.emptyHint}
          />
        ) : (
          <div className="-mx-3 -mt-3">
            <DataTable
              columns={columns}
              data={redirects}
              getRowKey={(redirect) => redirect.id}
              stickyHeader
            />
          </div>
        )}
      </PageBody>

      <PageFooter>
        <CreateActionButton onClick={handleAddRedirect} label={t.newRedirect} />
      </PageFooter>

      {dialogTarget ? (
        <RedirectUrlDialog
          key={`${dialogTarget.mode}:${dialogTarget.redirect.id}`}
          target={dialogTarget}
          redirects={redirects}
          onClose={() => dispatch({ dialogTarget: null })}
          onSave={handleSaveRedirect}
          isSaving={savingDialog}
          saveError={saveError}
        />
      ) : null}
    </PageLayout>
  );
});
