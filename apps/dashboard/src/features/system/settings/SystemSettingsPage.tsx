import { useState } from "react";

import {
  DashboardTabList,
  DashboardTabPanel,
  DashboardTabs,
  DashboardTabTrigger,
} from "@/components/ui/DashboardControls.tsx";
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

      <DashboardTabs value={activeTab} onValueChange={setActiveTab}>
        <DashboardTabList>
          <DashboardTabTrigger value="notifications">
            {t.notificationsTab}
          </DashboardTabTrigger>
          <DashboardTabTrigger value="domainAlerts">
            {t.domainAlertsTab}
          </DashboardTabTrigger>
        </DashboardTabList>

        <DashboardTabPanel className="pt-6" forceMount value="notifications">
          <NotificationsTab />
        </DashboardTabPanel>

        <DashboardTabPanel className="pt-6" forceMount value="domainAlerts">
          <DomainAlertsTab active={activeTab === "domainAlerts"} />
        </DashboardTabPanel>
      </DashboardTabs>
    </PageLayout>
  );
}
