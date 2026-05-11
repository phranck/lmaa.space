import { PencilSimpleIcon, TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { nanoid } from "nanoid";
import { memo, Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";

import {
  domainAlertRuleSchema,
  domainAlertRulesConfigSchema,
  parseDomainAlertDomains,
  type DomainAlertRule,
  type DomainAlertRulesConfig,
} from "@lmaa/contracts";
import { SETTINGS_KEYS } from "@lmaa/shared";
import { ToggleSwitch } from "@lmaa/ui/toggle-switch";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  CreateActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput, DashboardTextarea } from "@/components/ui/DashboardControls.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { fieldHintClass, fieldLabelClass } from "@/features/system/widget-utils.ts";

import { useSaveSystemSetting, useSystemSettings } from "./hooks/useSystemSettings.ts";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((module) => ({ default: module.MarkdownEditor })),
);

interface DomainAlertsTabProps {
  active: boolean;
}

type DomainAlertDialogTarget =
  | { mode: "create"; rule: DomainAlertRule }
  | { mode: "edit"; rule: DomainAlertRule };

function parseStoredConfig(raw: string | undefined): DomainAlertRulesConfig {
  if (!raw) return { rules: [] };
  try {
    const parsed = domainAlertRulesConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { rules: [] };
  } catch {
    return { rules: [] };
  }
}

function serializeConfig(config: DomainAlertRulesConfig): string {
  return JSON.stringify(config);
}

function createEmptyRule(name: string): DomainAlertRule {
  return {
    id: nanoid(),
    name,
    domainsText: "",
    messageMarkdown: "",
    isActive: true,
  };
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={fieldLabelClass}>{label}</span>
      {children}
      {error ? (
        <p className="px-1 text-xs leading-5 text-[var(--ds-danger-text)]">{error}</p>
      ) : hint ? (
        <p className={fieldHintClass}>{hint}</p>
      ) : null}
    </label>
  );
}

function getRuleErrors(
  rule: DomainAlertRule,
  messages: ReturnType<typeof useI18n>["messages"]["system"]["settings"]["domainAlerts"],
) {
  const parsed = domainAlertRuleSchema.safeParse(rule);
  const paths = parsed.success
    ? new Set<string>()
    : new Set(parsed.error.issues.map((issue) => String(issue.path[0])));

  return {
    name: paths.has("name") ? messages.nameRequired : null,
    domains: paths.has("domainsText") ? messages.domainsRequired : null,
    message: paths.has("messageMarkdown") ? messages.messageRequired : null,
  };
}

interface DomainAlertRuleDialogProps {
  target: DomainAlertDialogTarget | null;
  onClose: () => void;
  onSave: (target: DomainAlertDialogTarget) => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
}

function DomainAlertRuleDialog({
  target,
  onClose,
  onSave,
  isSaving,
  saveError,
}: DomainAlertRuleDialogProps) {
  const { messages } = useI18n();
  const t = messages.system.settings.domainAlerts;
  const common = messages.common;
  const [draft, setDraft] = useState<DomainAlertRule | null>(target?.rule ?? null);
  const [showValidationError, setShowValidationError] = useState(false);

  useEffect(() => {
    setDraft(target?.rule ?? null);
    setShowValidationError(false);
  }, [target]);

  const handleSave = useCallback(async () => {
    if (!target || !draft || isSaving) return;
    const parsed = domainAlertRuleSchema.safeParse(draft);
    if (!parsed.success) {
      setShowValidationError(true);
      return;
    }

    const nextTarget = { ...target, rule: draft } as DomainAlertDialogTarget;
    const saved = await onSave(nextTarget);
    if (saved) onClose();
  }, [draft, isSaving, onClose, onSave, target]);

  useEffect(() => {
    if (!target) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "s" || (!event.metaKey && !event.ctrlKey)) return;

      event.preventDefault();
      void handleSave();
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleSave, target]);

  if (!target || !draft) return null;

  const errors = getRuleErrors(draft, t);
  const displayName = draft.name.trim() || t.defaultName;
  const titleTemplate = target.mode === "create" ? t.dialogCreateTitle : t.dialogEditTitle;
  const title = titleTemplate.replace("{name}", displayName);

  function updateDraft(patch: Partial<DomainAlertRule>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{ storageKey: "system:domain-alert-rule-editor", defaultWidth: 760, minWidth: 560 }}
      aria-label={title}
    >
      <OverlayCard.Header>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <WarningCircleIcon weight="duotone" className={dialogHeaderIconClass} />
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-[var(--ds-text)]">{title}</h3>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-[var(--ds-text-muted)]">{t.enabledLabel}</span>
            <ToggleSwitch
              checked={draft.isActive}
              onChange={(checked) => updateDraft({ isActive: checked })}
              aria-label={t.enabledLabel}
            />
          </div>
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

        <Field label={t.nameLabel} error={showValidationError ? errors.name : null}>
          <DashboardInput
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
          />
        </Field>

        <Field
          label={t.domainsLabel}
          hint={t.domainsHint}
          error={showValidationError ? errors.domains : null}
        >
          <DashboardTextarea
            rows={4}
            value={draft.domainsText}
            onChange={(event) => updateDraft({ domainsText: event.target.value })}
            className="font-mono text-xs"
          />
        </Field>

        <Field
          label={t.messageLabel}
          hint={t.messageHint}
          error={showValidationError ? errors.message : null}
        >
          <Suspense
            fallback={
              <div className="rounded-control border border-[var(--ds-border)] px-3 py-2 text-sm text-[var(--ds-text-muted)]">
                {t.loadingEditor}
              </div>
            }
          >
            <MarkdownEditor
              value={draft.messageMarkdown}
              onChange={(value) => updateDraft({ messageMarkdown: value })}
              rows={12}
              resizable
            />
          </Suspense>
        </Field>
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <CancelActionButton label={common.cancel} onClick={onClose} disabled={isSaving} />
        <SaveActionButton
          onClick={() => void handleSave()}
          disabled={isSaving}
          busy={isSaving}
          label={isSaving ? common.saving : target.mode === "create" ? t.createRule : t.saveRule}
        />
      </OverlayCard.Footer>
    </OverlayCard>
  );
}

export const DomainAlertsTab = memo(function DomainAlertsTab({ active }: DomainAlertsTabProps) {
  const { messages } = useI18n();
  const t = messages.system.settings.domainAlerts;
  const common = messages.common;
  const { data: settings } = useSystemSettings();
  const saveSetting = useSaveSystemSetting();
  const rawDomainAlertRulesSetting = settings?.[SETTINGS_KEYS.DOMAIN_ALERT_RULES];

  const initialConfig = useMemo(
    () => parseStoredConfig(rawDomainAlertRulesSetting),
    [rawDomainAlertRulesSetting],
  );
  const [rules, setRules] = useState<DomainAlertRule[]>(initialConfig.rules);
  const [dialogTarget, setDialogTarget] = useState<DomainAlertDialogTarget | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingDialog, setSavingDialog] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  useEffect(() => {
    setRules(initialConfig.rules);
    setDialogTarget(null);
    setShowValidationError(false);
    setSaveError(null);
  }, [initialConfig]);

  const persistRules = useCallback(
    async (nextRules: DomainAlertRule[]) => {
      const parsed = domainAlertRulesConfigSchema.safeParse({ rules: nextRules });
      if (!parsed.success) {
        setShowValidationError(true);
        return false;
      }

      try {
        await saveSetting.mutateAsync({
          key: SETTINGS_KEYS.DOMAIN_ALERT_RULES,
          value: serializeConfig(parsed.data),
        });
        setRules(parsed.data.rules);
        setShowValidationError(false);
        setSaveError(null);
        return true;
      } catch {
        setSaveError(t.saveError);
        return false;
      }
    },
    [saveSetting, t.saveError],
  );

  const handleAddRule = useCallback(() => {
    setDialogTarget({ mode: "create", rule: createEmptyRule(t.defaultName) });
    setShowValidationError(false);
    setSaveError(null);
  }, [t.defaultName]);

  const handleSaveRule = useCallback(
    async (target: DomainAlertDialogTarget) => {
      const parsed = domainAlertRuleSchema.safeParse(target.rule);
      if (!parsed.success) return false;

      const nextRules =
        target.mode === "create"
          ? [...rules, parsed.data]
          : rules.map((rule) => (rule.id === parsed.data.id ? parsed.data : rule));

      setSavingDialog(true);
      try {
        return await persistRules(nextRules);
      } finally {
        setSavingDialog(false);
      }
    },
    [persistRules, rules],
  );

  const handleDeleteRule = useCallback(
    async (id: string) => {
      const nextRules = rules.filter((rule) => rule.id !== id);
      setDeletingRuleId(id);
      try {
        const saved = await persistRules(nextRules);
        if (saved) {
          setDialogTarget((current) => (current?.rule.id === id ? null : current));
        }
      } finally {
        setDeletingRuleId(null);
      }
    },
    [persistRules, rules],
  );

  const columns: ColumnDef<DomainAlertRule>[] = useMemo(
    () => [
      {
        id: "order",
        headerClassName: "w-10",
        cellClassName: "w-10 text-[var(--ds-text-muted)]",
        cell: (row) => String(rules.findIndex((rule) => rule.id === row.id) + 1),
      },
      {
        id: "name",
        header: t.tableColumnName,
        cell: (row) => (
          <span className="font-medium text-[var(--ds-text)]">{row.name || t.defaultName}</span>
        ),
      },
      {
        id: "domains",
        header: t.tableColumnDomains,
        cell: (row) => {
          const domains = parseDomainAlertDomains(row.domainsText);
          return (
            <span
              className="block max-w-[38rem] truncate font-mono text-xs text-[var(--ds-text-muted)]"
              title={domains.join(", ")}
            >
              {t.domainCountLabel.replace("{count}", String(domains.length))}
              {domains.length > 0 ? ` · ${domains.join(", ")}` : ""}
            </span>
          );
        },
      },
      {
        id: "status",
        header: t.tableColumnStatus,
        cell: (row) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              row.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-stone-500/10 text-stone-400"
            }`}
          >
            {row.isActive ? t.active : t.inactive}
          </span>
        ),
      },
      {
        id: "actions",
        header: t.tableColumnActions,
        cellClassName: "text-right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <TableActionButton
              variant="neutral"
              icon={<PencilSimpleIcon weight="duotone" className="size-3.5" />}
              label={t.editRule}
              onClick={() => {
                setSaveError(null);
                setDialogTarget({ mode: "edit", rule: { ...row } });
              }}
              disabled={savingDialog || deletingRuleId !== null}
            />
            <TableActionButton
              variant="danger"
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
              label={deletingRuleId === row.id ? common.saving : t.deleteRule}
              onClick={() => void handleDeleteRule(row.id)}
              disabled={savingDialog || deletingRuleId !== null}
            />
          </div>
        ),
      },
    ],
    [common.saving, deletingRuleId, handleDeleteRule, rules, savingDialog, t],
  );

  return (
    <div className="space-y-3">
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

      {rules.length === 0 ? (
        <ContentUnavailableView
          chromeless
          icon={<WarningCircleIcon weight="duotone" aria-hidden />}
          title={t.emptyTitle}
          subtitle={t.emptyHint}
        />
      ) : (
        <DataTable columns={columns} data={rules} getRowKey={(rule) => rule.id} stickyHeader />
      )}

      {active ? (
        <PageFooter>
          <CreateActionButton onClick={handleAddRule} label={t.newRule} />
        </PageFooter>
      ) : null}

      <DomainAlertRuleDialog
        target={dialogTarget}
        onClose={() => setDialogTarget(null)}
        onSave={handleSaveRule}
        isSaving={savingDialog}
        saveError={saveError}
      />
    </div>
  );
});
