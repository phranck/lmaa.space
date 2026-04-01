import { type ReactNode, useState } from "react";
import { FaGlobe } from "react-icons/fa6";

import { DashboardSection } from "@lmaa/ui";

import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  COLLAPSIBLE_ROW_LIMIT,
  type MetricTabConfig,
  getEnvironmentIcon,
  parseLocationDisplay,
  toMetricText,
} from "@/features/analytics/analytics-utils.ts";
import { CollapsibleList } from "@/features/analytics/CollapsibleList.tsx";
import {
  type UmamiMetricType,
  type UmamiPeriod,
  useUmamiMetrics,
} from "@/features/analytics/hooks/useUmamiStats.ts";
import type { DashboardLocale } from "@/i18n/messages.ts";

function TabbedMetricRowList({
  rows,
  total,
  activeType,
  activeTab,
  locale,
  unknownLabel,
  formatNumber,
}: {
  rows: { x: unknown; y: number }[];
  total: number;
  activeType: UmamiMetricType;
  activeTab: MetricTabConfig;
  locale: DashboardLocale;
  unknownLabel: string;
  formatNumber: (n: number) => string;
}) {
  return (
    <ul className="pt-2 space-y-1.5">
      {rows.map((row) => {
        const percentage = total > 0 ? Math.round((row.y / total) * 100) : 0;
        const rowText = toMetricText(row.x);
        let label = activeTab.renderLabel
          ? activeTab.renderLabel(rowText)
          : rowText || unknownLabel;
        const EnvironmentIcon = getEnvironmentIcon(activeType, rowText);
        let leadingVisual: ReactNode = null;

        if (activeType === "country" || activeType === "region" || activeType === "city") {
          const parsed = parseLocationDisplay(activeType, rowText, locale, unknownLabel);
          label = parsed.label;
          leadingVisual = parsed.flag ? (
            <span className="shrink-0 leading-none">{parsed.flag}</span>
          ) : (
            <FaGlobe className="w-3.5 h-3.5 shrink-0 opacity-70" />
          );
        } else if (EnvironmentIcon) {
          leadingVisual = <EnvironmentIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />;
        }

        return (
          <li
            key={`${activeType}-${rowText}`}
            className="grid grid-cols-[1fr_auto_auto] gap-3 text-base py-0.5"
          >
            <span
              className="min-w-0 flex items-center gap-2 text-[var(--ds-text-muted)]"
              title={label}
            >
              {leadingVisual}
              <span className="truncate">{label}</span>
            </span>
            <span className="text-right text-[var(--ds-text)] tabular-nums">
              {formatNumber(row.y)}
            </span>
            <span className="text-right text-[var(--ds-text-subtle)] tabular-nums">
              {percentage}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface TabbedMetricCardProps {
  title: string;
  icon: ReactNode;
  tabs: readonly MetricTabConfig[];
  period: UmamiPeriod;
  storageKey: string;
}

export function TabbedMetricCard({ title, icon, tabs, period, storageKey }: TabbedMetricCardProps) {
  const { locale, messages, formatNumber } = useI18n();
  const analyticsMessages = messages.dashboard.analytics;
  const [activeType, setActiveType] = useState<UmamiMetricType>(tabs[0]?.value ?? "country");
  const activeTab = tabs.find((tab) => tab.value === activeType) ?? tabs[0];
  const { data, isLoading } = useUmamiMetrics(activeTab.value, period);
  const rows = data ?? [];
  const collapsedRows = rows.slice(0, COLLAPSIBLE_ROW_LIMIT);
  const canCollapse = rows.length > COLLAPSIBLE_ROW_LIMIT;
  const total = rows.reduce((sum, row) => sum + row.y, 0);

  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={icon}
        title={title}
        addOn={
          <SegmentedControl
            value={activeType}
            onChange={setActiveType}
            storageKey={storageKey}
            options={tabs.map((tab) => ({ value: tab.value, label: tab.label }))}
          />
        }
      />
      <DashboardSection.Body>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 pb-2 border-b border-[var(--ds-border-subtle)] text-sm font-medium text-[var(--ds-text-subtle)]">
          <span>{activeTab.columnLabel}</span>
          <span className="text-right">{analyticsMessages.visitors}</span>
          <span className="text-right">{analyticsMessages.percentColumn}</span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => `env-sk-${title}-${i}`).map((k) => (
              <div key={k} className="h-6 bg-[var(--ds-bg-elevated)] rounded animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--ds-text-subtle)] py-6 text-center">
            {analyticsMessages.noData}
          </p>
        ) : (
          <CollapsibleList
            canCollapse={canCollapse}
            collapsedContent={<TabbedMetricRowList rows={collapsedRows} total={total} activeType={activeType} activeTab={activeTab} locale={locale} unknownLabel={analyticsMessages.unknown} formatNumber={formatNumber} />}
            expandedContent={<TabbedMetricRowList rows={rows} total={total} activeType={activeType} activeTab={activeTab} locale={locale} unknownLabel={analyticsMessages.unknown} formatNumber={formatNumber} />}
          />
        )}
      </DashboardSection.Body>
    </DashboardSection>
  );
}
