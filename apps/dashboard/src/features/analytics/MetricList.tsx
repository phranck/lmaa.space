import { useI18n } from "@/context/I18nContext.tsx";
import {
  COLLAPSIBLE_ROW_LIMIT,
  countryFlag,
  toMetricText,
} from "@/features/analytics/analytics-utils.ts";
import { CollapsibleList } from "@/features/analytics/CollapsibleList.tsx";
import {
  type UmamiMetricType,
  type UmamiPeriod,
  useUmamiMetrics,
} from "@/features/analytics/hooks/useUmamiStats.ts";

function MetricRowList({
  rows,
  type,
  max,
  renderLabel,
  unknownLabel,
  formatNumber,
}: {
  rows: { x: unknown; y: number }[];
  type: UmamiMetricType;
  max: number;
  renderLabel?: (x: string) => string;
  unknownLabel: string;
  formatNumber: (n: number) => string;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const rowText = toMetricText(row.x);
        const rowLabel = renderLabel ? renderLabel(rowText) : rowText || unknownLabel;
        return (
          <li key={`${type}-${rowText}`} className="flex items-center gap-2 text-sm">
            <span className="shrink-0 w-5 text-base leading-none">
              {type === "country" && rowText ? countryFlag(rowText) : null}
            </span>
            <span className="flex-1 truncate text-[var(--ds-text-muted)]" title={rowLabel}>
              {rowLabel}
            </span>
            <div className="w-20 h-1.5 bg-[var(--ds-bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${Math.round((row.y / max) * 100)}%` }}
              />
            </div>
            <span className="shrink-0 w-8 text-right text-sm text-[var(--ds-text-muted)]">
              {formatNumber(row.y)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface MetricListProps {
  title: string;
  type: UmamiMetricType;
  period: UmamiPeriod;
  renderLabel?: (x: string) => string;
}

export function MetricList({ title, type, period, renderLabel }: MetricListProps) {
  const { messages, formatNumber } = useI18n();
  const analyticsMessages = messages.dashboard.analytics;
  const { data, isLoading } = useUmamiMetrics(type, period);
  const rows = data ?? [];
  const max = rows[0]?.y ?? 1;
  const collapsedRows = rows.slice(0, COLLAPSIBLE_ROW_LIMIT);
  const canCollapse = rows.length > COLLAPSIBLE_ROW_LIMIT;

  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4 flex flex-col gap-3">
      <p className="text-base font-medium text-[var(--ds-text)]">{title}</p>
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((k) => (
            <div key={k} className="h-7 bg-[var(--ds-bg-elevated)] rounded animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-[var(--ds-text-subtle)] py-4 text-center">
          {analyticsMessages.noData}
        </p>
      )}
      {!isLoading && rows.length > 0 && (
        <CollapsibleList
          canCollapse={canCollapse}
          collapsedContent={<MetricRowList rows={collapsedRows} type={type} max={max} renderLabel={renderLabel} unknownLabel={analyticsMessages.unknown} formatNumber={formatNumber} />}
          expandedContent={<MetricRowList rows={rows} type={type} max={max} renderLabel={renderLabel} unknownLabel={analyticsMessages.unknown} formatNumber={formatNumber} />}
        />
      )}
    </div>
  );
}
