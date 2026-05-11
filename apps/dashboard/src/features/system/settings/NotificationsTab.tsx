import { BellIcon } from "@phosphor-icons/react";
import { memo, useCallback, useMemo, useState } from "react";

import { SETTINGS_KEYS } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { ToggleSwitch } from "@lmaa/ui/toggle-switch";

import { SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardCombobox } from "@/components/ui/DashboardControls.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useEmailTemplates } from "@/features/templates/hooks/useEmailTemplates.ts";

import { useSaveSystemSetting, useSystemSettings } from "./hooks/useSystemSettings.ts";

const rowLabelClass = "text-sm font-medium text-[var(--ds-text)]";

interface NotificationDraftState {
  baselineEnabled: boolean;
  baselineTemplateId: string;
  enabled: boolean;
  templateId: string;
}

function createNotificationDraft(
  baselineEnabled: boolean,
  baselineTemplateId: string,
): NotificationDraftState {
  return {
    baselineEnabled,
    baselineTemplateId,
    enabled: baselineEnabled,
    templateId: baselineTemplateId,
  };
}

export const NotificationsTab = memo(function NotificationsTab() {
  const { messages } = useI18n();
  const common = messages.common;
  const t = messages.system.settings.newShopSubmission;

  const { data: settings } = useSystemSettings();
  const { data: templates, isLoading: templatesLoading } = useEmailTemplates();
  const saveSetting = useSaveSystemSetting();

  const initialEnabled = settings?.[SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_ENABLED] === "true";
  const initialTemplateId = settings?.[SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID] ?? "";

  const [draft, setDraft] = useState(() =>
    createNotificationDraft(initialEnabled, initialTemplateId),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const baselineChanged =
    draft.baselineEnabled !== initialEnabled || draft.baselineTemplateId !== initialTemplateId;
  const currentDraft = baselineChanged
    ? createNotificationDraft(initialEnabled, initialTemplateId)
    : draft;

  if (baselineChanged) {
    setDraft(currentDraft);
  }

  const { enabled, templateId } = currentDraft;

  const dirty = useMemo(
    () =>
      currentDraft.enabled !== currentDraft.baselineEnabled ||
      currentDraft.templateId !== currentDraft.baselineTemplateId,
    [currentDraft],
  );

  const save = useCallback(async () => {
    const nextEnabled = enabled && templateId !== "" ? "true" : "false";
    setSaving(true);
    try {
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
      setSaveError(null);
    } catch {
      setSaveError(common.unknownError);
    } finally {
      setSaving(false);
    }
  }, [common.unknownError, enabled, templateId, saveSetting]);

  const canEnable = templateId !== "";
  const handleToggle = useCallback(
    (next: boolean) => {
      if (saving || (next && !canEnable)) return;
      setDraft((current) => ({ ...current, enabled: next }));
    },
    [canEnable, saving],
  );

  const handleTemplateChange = useCallback((id: string) => {
    setDraft((current) => ({
      ...current,
      enabled: id === "" ? false : current.enabled,
      templateId: id,
    }));
  }, []);

  return (
    <div className="max-w-xl">
      <DashboardSection>
        <DashboardSection.Header
          icon={<BellIcon weight="duotone" className="size-4" />}
          title={t.title}
          subtitle={`${t.recipientLabel}: OWNER_EMAIL`}
          addOn={
            <ToggleSwitch
              checked={enabled}
              onChange={handleToggle}
              disabled={saving || (!canEnable && !enabled)}
            />
          }
        />
        <DashboardSection.Body>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="shop-submission-template" className={rowLabelClass}>
              {t.templateLabel}
            </label>
            <DashboardCombobox
              id="shop-submission-template"
              value={templateId}
              onValueChange={handleTemplateChange}
              disabled={templatesLoading || saving}
              className="w-72"
              options={[
                {
                  value: "",
                  label: templatesLoading ? t.templateLoading : t.templatePlaceholder,
                },
                ...(templates?.map((template) => ({
                  value: String(template.id),
                  label: template.name,
                })) ?? []),
              ]}
            />
          </div>
          {saveError ? (
            <p className="mt-3 text-xs text-[var(--ds-danger-text)]">{saveError}</p>
          ) : null}
        </DashboardSection.Body>
        <DashboardSection.Footer className="flex flex-wrap items-center justify-between gap-3">
          <span className="min-w-0 flex-1 text-xs text-[var(--ds-text-muted)]">
            {canEnable ? t.hint : t.requireTemplateHint}
          </span>
          <SaveActionButton
            onClick={() => void save()}
            disabled={!dirty || saving}
            busy={saving}
            label={saving ? common.saving : common.save}
          />
        </DashboardSection.Footer>
      </DashboardSection>
    </div>
  );
});
