import { ImageIcon } from "@phosphor-icons/react";

import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { HeroBannerTab } from "./HeroBannerTab.tsx";

const TABS = ["heroBanner"] as const;
type TabId = (typeof TABS)[number];
const TAB_ICONS: Record<TabId, React.ReactNode> = {
  heroBanner: <ImageIcon weight="duotone" className="size-4" />,
};

/**
 * Landing page editor with tab-based sections.
 *
 * Currently contains a single "Hero Banner" tab for managing the
 * homepage hero image rotation pool.
 */
export function LandingPagePage() {
  const { messages } = useI18n();
  const m = messages.landingPage;

  const tabLabel: Record<TabId, string> = {
    heroBanner: m.tabHeroBanner,
  };

  // Single tab for now -- no useState needed, always "heroBanner"
  const activeTab: TabId = "heroBanner";

  return (
    <PageLayout>
      <PageHeader title={m.title} />

      {/* Tab bar -- full-width block, border-b on the container */}
      <div className="border-b border-[var(--ds-border-subtle)] shrink-0">
        <div className="flex items-end px-4 pt-2">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors cursor-default ${
                activeTab === tab
                  ? "border-[var(--color-primary)] text-[var(--ds-text)] font-medium"
                  : "border-transparent text-[var(--ds-text-subtle)]"
              }`}
            >
              {TAB_ICONS[tab]}
              {tabLabel[tab]}
            </div>
          ))}
        </div>
      </div>

      <PageBody>{activeTab === "heroBanner" && <HeroBannerTab />}</PageBody>
    </PageLayout>
  );
}
