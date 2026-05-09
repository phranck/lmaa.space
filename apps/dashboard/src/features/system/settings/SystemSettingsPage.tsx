import { useState } from "react";

import { TabList, TabTrigger, Tabs } from "@lmaa/ui";

import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { DomainAlertsTab } from "./DomainAlertsTab.tsx";
import { NotificationsTab } from "./NotificationsTab.tsx";

export function SystemSettingsPage() {
  const { messages } = useI18n();
  const t = messages.system.settings;

  const [activeTab, setActiveTab] = useState("notifications");

  return (
    <PageLayout>
      <PageHeader title={t.title} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabList>
          <TabTrigger value="notifications">{t.notificationsTab}</TabTrigger>
          <TabTrigger value="domainAlerts">{t.domainAlertsTab}</TabTrigger>
        </TabList>

        <div
          role="tabpanel"
          className={activeTab === "notifications" ? "pt-6" : "hidden"}
        >
          <NotificationsTab />
        </div>

        <div
          role="tabpanel"
          className={activeTab === "domainAlerts" ? "pt-6" : "hidden"}
        >
          <DomainAlertsTab active={activeTab === "domainAlerts"} />
        </div>
      </Tabs>
    </PageLayout>
  );
}
