import { FloppyDiskIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

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

const inputClass =
  "w-full h-9 mt-1 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)]";
const labelClass =
  "text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]";
const hintClass = "text-xs text-[var(--ds-text-muted)] mt-1";
const sectionClass =
  "rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4";

export function AffiliateSettingsPage() {
  const { messages } = useI18n();
  const t = messages.affiliate;
  const { data: settings, isLoading } = useAffiliateSettings();
  const saveSetting = useSaveAffiliateSetting();

  const [activeTab, setActiveTab] = useState("ollama");

  // Ollama
  const [host, setHost] = useState("");
  const [ollamaApiKey, setOllamaApiKey] = useState("");

  // Awin
  const [awinPublisherId, setAwinPublisherId] = useState("");
  const [awinApiToken, setAwinApiToken] = useState("");

  // Tradedoubler
  const [tdPublisherId, setTdPublisherId] = useState("");
  const [tdToken, setTdToken] = useState("");

  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setHost(settings[SETTINGS_KEYS.OLLAMA_HOST] ?? "");
      setOllamaApiKey(settings[SETTINGS_KEYS.OLLAMA_API_KEY] ?? "");
      setAwinPublisherId(settings[SETTINGS_KEYS.AWIN_PUBLISHER_ID] ?? "");
      setAwinApiToken(settings[SETTINGS_KEYS.AWIN_API_TOKEN] ?? "");
      setTdPublisherId(settings[SETTINGS_KEYS.TRADEDOUBLER_PUBLISHER_ID] ?? "");
      setTdToken(settings[SETTINGS_KEYS.TRADEDOUBLER_TOKEN] ?? "");
      setDirty(false);
    }
  }, [settings]);

  function handleSave() {
    const pairs: Array<{ key: string; current: string; local: string }> = [
      { key: SETTINGS_KEYS.OLLAMA_HOST, current: settings?.[SETTINGS_KEYS.OLLAMA_HOST] ?? "", local: host },
      { key: SETTINGS_KEYS.OLLAMA_API_KEY, current: settings?.[SETTINGS_KEYS.OLLAMA_API_KEY] ?? "", local: ollamaApiKey },
      { key: SETTINGS_KEYS.AWIN_PUBLISHER_ID, current: settings?.[SETTINGS_KEYS.AWIN_PUBLISHER_ID] ?? "", local: awinPublisherId },
      { key: SETTINGS_KEYS.AWIN_API_TOKEN, current: settings?.[SETTINGS_KEYS.AWIN_API_TOKEN] ?? "", local: awinApiToken },
      { key: SETTINGS_KEYS.TRADEDOUBLER_PUBLISHER_ID, current: settings?.[SETTINGS_KEYS.TRADEDOUBLER_PUBLISHER_ID] ?? "", local: tdPublisherId },
      { key: SETTINGS_KEYS.TRADEDOUBLER_TOKEN, current: settings?.[SETTINGS_KEYS.TRADEDOUBLER_TOKEN] ?? "", local: tdToken },
    ];

    const saves = pairs
      .filter((p) => p.local !== p.current)
      .map((p) => saveSetting.mutateAsync({ key: p.key, value: p.local }));

    Promise.all(saves).then(() => setDirty(false));
  }

  function markDirty() {
    setDirty(true);
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
          className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
        >
          <FloppyDiskIcon weight="duotone" className="w-3.5 h-3.5" />
          {saveSetting.isPending ? messages.common.saving : messages.common.save}
        </button>
      </PageHeader>

      <div className="max-w-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabList>
            <TabTrigger value="ollama">{t.settings.ollamaSection}</TabTrigger>
            <TabTrigger value="awin">{t.settings.awinSection}</TabTrigger>
            <TabTrigger value="tradedoubler">{t.settings.tradedoublerSection}</TabTrigger>
          </TabList>

          <TabContent value="ollama" className="pt-6">
            <div className={sectionClass}>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>{t.settings.hostLabel}</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => { setHost(e.target.value); markDirty(); }}
                    placeholder={t.settings.hostPlaceholder}
                    className={inputClass}
                  />
                  <p className={hintClass}>{t.settings.hostHint}</p>
                </div>
                <div>
                  <label className={labelClass}>{t.settings.apiKeyLabel}</label>
                  <input
                    type="password"
                    value={ollamaApiKey}
                    onChange={(e) => { setOllamaApiKey(e.target.value); markDirty(); }}
                    placeholder={t.settings.apiKeyPlaceholder}
                    className={inputClass}
                  />
                  <p className={hintClass}>{t.settings.apiKeyHint}</p>
                </div>
              </div>
            </div>
          </TabContent>

          <TabContent value="awin" className="pt-6">
            <div className={sectionClass}>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>{t.settings.awinPublisherIdLabel}</label>
                  <input
                    type="text"
                    value={awinPublisherId}
                    onChange={(e) => { setAwinPublisherId(e.target.value); markDirty(); }}
                    placeholder={t.settings.awinPublisherIdPlaceholder}
                    className={inputClass}
                  />
                  <p className={hintClass}>{t.settings.awinPublisherIdHint}</p>
                </div>
                <div>
                  <label className={labelClass}>{t.settings.awinApiTokenLabel}</label>
                  <input
                    type="password"
                    value={awinApiToken}
                    onChange={(e) => { setAwinApiToken(e.target.value); markDirty(); }}
                    placeholder={t.settings.awinApiTokenPlaceholder}
                    className={inputClass}
                  />
                  <p className={hintClass}>{t.settings.awinApiTokenHint}</p>
                </div>
                <NetworkValidationButton network="awin" />
              </div>
            </div>
          </TabContent>

          <TabContent value="tradedoubler" className="pt-6">
            <div className={sectionClass}>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>{t.settings.tradedoublerPublisherIdLabel}</label>
                  <input
                    type="text"
                    value={tdPublisherId}
                    onChange={(e) => { setTdPublisherId(e.target.value); markDirty(); }}
                    placeholder={t.settings.tradedoublerPublisherIdPlaceholder}
                    className={inputClass}
                  />
                  <p className={hintClass}>{t.settings.tradedoublerPublisherIdHint}</p>
                </div>
                <div>
                  <label className={labelClass}>{t.settings.tradedoublerTokenLabel}</label>
                  <input
                    type="password"
                    value={tdToken}
                    onChange={(e) => { setTdToken(e.target.value); markDirty(); }}
                    placeholder={t.settings.tradedoublerTokenPlaceholder}
                    className={inputClass}
                  />
                  <p className={hintClass}>{t.settings.tradedoublerTokenHint}</p>
                </div>
                <NetworkValidationButton network="tradedoubler" />
              </div>
            </div>
          </TabContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}

function NetworkValidationButton({ network }: { network: string }) {
  const { messages } = useI18n();
  const t = messages.affiliate.settings;
  const validate = useValidateNetworkCredentials();

  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={() => validate.mutate(network)}
        disabled={validate.isPending}
        className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-border)] text-sm font-medium text-[var(--ds-text)] hover:bg-[var(--ds-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {validate.isPending ? t.validating : t.validateConnection}
      </button>
      {validate.isSuccess && (
        <span className="text-xs font-medium text-green-600">{t.connectionValid}</span>
      )}
      {validate.isError && (
        <span className="text-xs font-medium text-red-600">{t.connectionInvalid}</span>
      )}
    </div>
  );
}
