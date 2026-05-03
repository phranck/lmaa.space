import { FloppyDiskIcon } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";

import { TabContent, TabList, TabTrigger, Tabs } from "@lmaa/ui";

import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { NotificationsTab } from "./NotificationsTab.tsx";

export function SystemSettingsPage() {
  const { messages } = useI18n();
  const t = messages.system.settings;

  const [activeTab, setActiveTab] = useState("notifications");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saverRef = useRef<(() => Promise<void>) | null>(null);

  const registerSaver = useCallback((save: () => Promise<void>) => {
    saverRef.current = save;
  }, []);

  const handleSave = useCallback(async () => {
    if (!saverRef.current || !dirty) return;
    setSaving(true);
    try {
      await saverRef.current();
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [dirty]);

  return (
    <PageLayout>
      <PageHeader title={t.title}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="h-9 px-3 flex items-center gap-1.5 rounded-control border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
        >
          <FloppyDiskIcon weight="duotone" className="w-3.5 h-3.5" />
          {saving ? messages.common.saving : messages.common.save}
        </button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabList>
          <TabTrigger value="notifications">{t.notificationsTab}</TabTrigger>
        </TabList>

        <TabContent value="notifications" className="pt-6">
          <NotificationsTab onDirtyChange={setDirty} registerSaver={registerSaver} />
        </TabContent>
      </Tabs>
    </PageLayout>
  );
}
