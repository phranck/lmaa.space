import { FloppyDiskIcon, GearIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { SETTINGS_KEYS } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useAffiliateSettings,
  useSaveAffiliateSetting,
} from "@/features/affiliate/hooks/useAffiliateSettings.ts";

export function AffiliateSettingsPage() {
  const { messages } = useI18n();
  const t = messages.affiliate;
  const { data: settings, isLoading } = useAffiliateSettings();
  const saveSetting = useSaveAffiliateSetting();

  const [host, setHost] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setHost(settings[SETTINGS_KEYS.OLLAMA_HOST] ?? "");
      setApiKey(settings[SETTINGS_KEYS.OLLAMA_API_KEY] ?? "");
      setDirty(false);
    }
  }, [settings]);

  function handleSave() {
    const saves: Promise<unknown>[] = [];

    const currentHost = settings?.[SETTINGS_KEYS.OLLAMA_HOST] ?? "";
    const currentKey = settings?.[SETTINGS_KEYS.OLLAMA_API_KEY] ?? "";

    if (host !== currentHost) {
      saves.push(
        saveSetting.mutateAsync({ key: SETTINGS_KEYS.OLLAMA_HOST, value: host }),
      );
    }
    if (apiKey !== currentKey) {
      saves.push(
        saveSetting.mutateAsync({ key: SETTINGS_KEYS.OLLAMA_API_KEY, value: apiKey }),
      );
    }

    Promise.all(saves).then(() => setDirty(false));
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

      <div className="max-w-xl space-y-6">
        {/* Ollama Section */}
        <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4">
          <h3 className="text-sm font-semibold text-[var(--ds-text)] mb-4">{t.settings.ollamaSection}</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]">
                {t.settings.hostLabel}
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => {
                  setHost(e.target.value);
                  setDirty(true);
                }}
                placeholder={t.settings.hostPlaceholder}
                className="w-full h-9 mt-1 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)]"
              />
              <p className="text-xs text-[var(--ds-text-muted)] mt-1">{t.settings.hostHint}</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-muted)]">
                {t.settings.apiKeyLabel}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setDirty(true);
                }}
                placeholder={t.settings.apiKeyPlaceholder}
                className="w-full h-9 mt-1 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)]"
              />
              <p className="text-xs text-[var(--ds-text-muted)] mt-1">{t.settings.apiKeyHint}</p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
