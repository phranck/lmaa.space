import { ArrowSquareOutIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import type { SettingsKey } from "@lmaa/shared";
import { SETTINGS_KEYS } from "@lmaa/shared";
import { TabContent, TabList, TabTrigger, Tabs } from "@lmaa/ui";

import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useAffiliateSettings,
  useSaveAffiliateSetting,
} from "@/features/affiliate/hooks/useAffiliateSettings.ts";
import { useValidateNetworkCredentials } from "@/features/affiliate/hooks/useNetworkMatch.ts";

/* ------------------------------------------------------------------ */
/*  Shared CSS tokens                                                 */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full h-9 mt-1 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)]";
const labelClass =
  "text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]";
const hintClass = "text-xs text-[var(--ds-text-muted)] mt-1";
const sectionClass =
  "rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4";
const linkBtnClass =
  "h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-border)] text-sm font-medium text-[var(--ds-text)] hover:bg-[var(--ds-bg-elevated)]";

/* ------------------------------------------------------------------ */
/*  Tab config                                                        */
/* ------------------------------------------------------------------ */

interface FieldDef {
  settingsKey: SettingsKey;
  label: string;
  placeholder: string;
  hint: string;
  type: "text" | "password";
}

interface TabConfig {
  id: string;
  title: string;
  networkId?: string;
  dashboardUrl?: string;
  dashboardLabel?: string;
  fields: FieldDef[];
}

function buildTabs(t: Record<string, string>): TabConfig[] {
  return [
    {
      id: "ollama",
      title: t.ollamaSection,
      fields: [
        { settingsKey: SETTINGS_KEYS.OLLAMA_HOST, label: t.hostLabel, placeholder: t.hostPlaceholder, hint: t.hostHint, type: "text" },
        { settingsKey: SETTINGS_KEYS.OLLAMA_API_KEY, label: t.apiKeyLabel, placeholder: t.apiKeyPlaceholder, hint: t.apiKeyHint, type: "password" },
      ],
    },
    {
      id: "adcell",
      title: t.adcellSection,
      networkId: "adcell",
      dashboardUrl: "https://www.adcell.de/publisher",
      dashboardLabel: "Adcell Dashboard",
      fields: [
        { settingsKey: SETTINGS_KEYS.ADCELL_PUBLISHER_ID, label: t.adcellPublisherIdLabel, placeholder: t.adcellPublisherIdPlaceholder, hint: t.adcellPublisherIdHint, type: "text" },
        { settingsKey: SETTINGS_KEYS.ADCELL_API_PASSWORD, label: t.adcellApiPasswordLabel, placeholder: t.adcellApiPasswordPlaceholder, hint: t.adcellApiPasswordHint, type: "password" },
      ],
    },
    {
      id: "awin",
      title: t.awinSection,
      networkId: "awin",
      dashboardUrl: "https://ui.awin.com",
      dashboardLabel: "Awin Dashboard",
      fields: [
        { settingsKey: SETTINGS_KEYS.AWIN_PUBLISHER_ID, label: t.awinPublisherIdLabel, placeholder: t.awinPublisherIdPlaceholder, hint: t.awinPublisherIdHint, type: "text" },
        { settingsKey: SETTINGS_KEYS.AWIN_API_TOKEN, label: t.awinApiTokenLabel, placeholder: t.awinApiTokenPlaceholder, hint: t.awinApiTokenHint, type: "password" },
      ],
    },
    {
      id: "tradedoubler",
      title: t.tradedoublerSection,
      networkId: "tradedoubler",
      dashboardUrl: "https://publisher.tradedoubler.com",
      dashboardLabel: "Tradedoubler Dashboard",
      fields: [
        { settingsKey: SETTINGS_KEYS.TRADEDOUBLER_PUBLISHER_ID, label: t.tradedoublerPublisherIdLabel, placeholder: t.tradedoublerPublisherIdPlaceholder, hint: t.tradedoublerPublisherIdHint, type: "text" },
        { settingsKey: SETTINGS_KEYS.TRADEDOUBLER_TOKEN, label: t.tradedoublerTokenLabel, placeholder: t.tradedoublerTokenPlaceholder, hint: t.tradedoublerTokenHint, type: "password" },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export function AffiliateSettingsPage() {
  const { messages } = useI18n();
  const t = messages.affiliate;
  const { data: settings, isLoading } = useAffiliateSettings();
  const saveSetting = useSaveAffiliateSetting();

  const tabs = useMemo(() => buildTabs(t.settings as unknown as Record<string, string>), [t.settings]);
  const allKeys = useMemo(() => tabs.flatMap((tab) => tab.fields.map((f) => f.settingsKey)), [tabs]);

  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = {};
      for (const key of allKeys) {
        initial[key] = settings[key] ?? "";
      }
      setValues(initial);
      setDirty(false);
    }
  }, [settings, allKeys]);

  const setValue = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  async function handleSave() {
    const changed = allKeys.filter((key) => values[key] !== (settings?.[key] ?? ""));
    if (changed.length === 0) return;

    try {
      await Promise.all(
        changed.map((key) => saveSetting.mutateAsync({ key, value: values[key] })),
      );
      setDirty(false);
    } catch {
      // Query invalidation in useSaveAffiliateSetting will refetch;
      // dirty stays true so the user can retry.
    }
  }

  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader title={t.settings.title} />
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader title={t.settings.title}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saveSetting.isPending}
          className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
        >
          <FloppyDiskIcon weight="duotone" className="w-3.5 h-3.5" />
          {saveSetting.isPending ? messages.common.saving : messages.common.save}
        </button>
      </PageHeader>

      <div className="max-w-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabList>
            {tabs.map((tab) => (
              <TabTrigger key={tab.id} value={tab.id}>{tab.title}</TabTrigger>
            ))}
          </TabList>

          {tabs.map((tab) => (
            <TabContent key={tab.id} value={tab.id} className="pt-6">
              <div className={sectionClass}>
                <div className="space-y-4">
                  {tab.fields.map((field) => (
                    <SettingsField
                      key={field.settingsKey}
                      field={field}
                      value={values[field.settingsKey] ?? ""}
                      onChange={setValue}
                    />
                  ))}
                  {tab.networkId && (
                    <div className="flex items-center gap-3 pt-2">
                      <NetworkValidationButton network={tab.networkId} />
                      {tab.dashboardUrl && (
                        <a
                          href={tab.dashboardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkBtnClass}
                        >
                          <ArrowSquareOutIcon weight="duotone" className="w-3.5 h-3.5" />
                          {tab.dashboardLabel}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabContent>
          ))}
        </Tabs>
      </div>
    </PageLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Memoized field (avoids re-render on sibling changes)              */
/* ------------------------------------------------------------------ */

const SettingsField = memo(function SettingsField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{field.label}</label>
      <input
        type={field.type}
        value={value}
        onChange={(e) => onChange(field.settingsKey, e.target.value)}
        placeholder={field.placeholder}
        className={inputClass}
      />
      <p className={hintClass}>{field.hint}</p>
    </div>
  );
});

function NetworkValidationButton({ network }: { network: string }) {
  const { messages } = useI18n();
  const t = messages.affiliate.settings;
  const validate = useValidateNetworkCredentials();

  return (
    <>
      <button
        type="button"
        onClick={() => validate.mutate(network)}
        disabled={validate.isPending}
        className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-border)] text-sm font-medium text-[var(--ds-text)] hover:bg-[var(--ds-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {validate.isPending ? t.validating : t.validateConnection}
      </button>
      {validate.isSuccess && (
        <span className="text-xs font-medium text-green-600">{t.connectionValid}</span>
      )}
      {validate.isError && (
        <span className="text-xs font-medium text-red-600">{t.connectionInvalid}</span>
      )}
    </>
  );
}
