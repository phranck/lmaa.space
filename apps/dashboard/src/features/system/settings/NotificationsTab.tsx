import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { SETTINGS_KEYS } from "@lmaa/shared";
import { ToggleSwitch } from "@lmaa/ui";

import { useI18n } from "@/context/I18nContext.tsx";
import { useEmailTemplates } from "@/features/templates/hooks/useEmailTemplates.ts";

import {
  useSaveSystemSetting,
  useSystemSettings,
} from "./hooks/useSystemSettings.ts";

const cardClass =
  "rounded-card border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] divide-y divide-[var(--ds-border-subtle)]";
const rowClass = "flex items-center justify-between gap-4 px-4 py-3";
const rowLabelClass = "text-sm font-medium text-[var(--ds-text)]";
const rowSubtitleClass = "text-xs text-[var(--ds-text-muted)] mt-0.5";
const selectClass =
  "h-9 px-3 pr-8 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const hintClass = "mt-2 text-xs text-[var(--ds-text-muted)] px-1";

interface NotificationsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaver: (save: () => Promise<void>) => void;
}

export const NotificationsTab = memo(function NotificationsTab({
  onDirtyChange,
  registerSaver,
}: NotificationsTabProps) {
  const { messages } = useI18n();
  const t = messages.system.settings.newShopSubmission;

  const { data: settings } = useSystemSettings();
  const { data: templates, isLoading: templatesLoading } = useEmailTemplates();
  const saveSetting = useSaveSystemSetting();

  const initialEnabled =
    settings?.[SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_ENABLED] === "true";
  const initialTemplateId =
    settings?.[SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID] ?? "";

  const [enabled, setEnabled] = useState(initialEnabled);
  const [templateId, setTemplateId] = useState(initialTemplateId);

  useEffect(() => {
    setEnabled(initialEnabled);
    setTemplateId(initialTemplateId);
  }, [initialEnabled, initialTemplateId]);

  const dirty = useMemo(
    () => enabled !== initialEnabled || templateId !== initialTemplateId,
    [enabled, templateId, initialEnabled, initialTemplateId],
  );

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const save = useCallback(async () => {
    const nextEnabled = enabled && templateId !== "" ? "true" : "false";
    await Promise.all([
      saveSetting.mutateAsync({
        key: SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_ENABLED,
        value: nextEnabled,
      }),
      saveSetting.mutateAsync({
        key: SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID,
        value: templateId,
      }),
    ]);
  }, [enabled, templateId, saveSetting]);

  useEffect(() => {
    registerSaver(save);
  }, [save, registerSaver]);

  const canEnable = templateId !== "";
  const handleToggle = useCallback(
    (next: boolean) => {
      if (next && !canEnable) return;
      setEnabled(next);
    },
    [canEnable],
  );

  const handleTemplateChange = useCallback((id: string) => {
    setTemplateId(id);
    if (id === "") setEnabled(false);
  }, []);

  return (
    <div className="max-w-xl">
      <div className={cardClass}>
        <div className={rowClass}>
          <div className="min-w-0">
            <p className={rowLabelClass}>{t.title}</p>
            <p className={rowSubtitleClass}>{t.recipientLabel}: OWNER_EMAIL</p>
          </div>
          <ToggleSwitch
            checked={enabled}
            onChange={handleToggle}
            disabled={!canEnable && !enabled}
          />
        </div>
        <div className={rowClass}>
          <label htmlFor="shop-submission-template" className={rowLabelClass}>
            {t.templateLabel}
          </label>
          <select
            id="shop-submission-template"
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            disabled={templatesLoading}
            className={selectClass}
          >
            <option value="">
              {templatesLoading ? t.templateLoading : t.templatePlaceholder}
            </option>
            {templates?.map((tmpl) => (
              <option key={tmpl.id} value={String(tmpl.id)}>
                {tmpl.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className={hintClass}>
        {canEnable ? t.hint : t.requireTemplateHint}
      </p>
    </div>
  );
});
