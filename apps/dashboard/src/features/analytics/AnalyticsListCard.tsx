import type { ReactNode } from "react";

import { DashboardSection } from "@lmaa/ui";

import { useI18n } from "@/context/I18nContext.tsx";
import { COLLAPSIBLE_ROW_LIMIT } from "@/features/analytics/analytics-utils.ts";
import { CollapsibleList } from "@/features/analytics/CollapsibleList.tsx";
import type { UmamiEventValueRow } from "@/features/analytics/hooks/useUmamiStats.ts";

function EventRowList({
  rows,
  max,
  keyPrefix,
  formatNumber,
}: {
  rows: UmamiEventValueRow[];
  max: number;
  keyPrefix: string;
  formatNumber: (n: number) => string;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={`${keyPrefix}-${row.value}`} className="flex items-center gap-2 text-sm">
          <span className="flex-1 truncate text-[var(--ds-text-muted)]" title={row.value}>
            {row.value}
          </span>
          <div className="w-20 h-1.5 bg-[var(--ds-bg-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${Math.round((row.total / max) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 w-10 text-right text-sm text-[var(--ds-text-muted)]">
            {formatNumber(row.total)}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface EventListCardProps {
  title: string;
  icon: ReactNode;
  rows: UmamiEventValueRow[];
  isLoading: boolean;
}

export function EventListCard({ title, icon, rows, isLoading }: EventListCardProps) {
  const { messages, formatNumber } = useI18n();
  const analyticsMessages = messages.dashboard.analytics;
  const max = rows[0]?.total ?? 1;
  const collapsedRows = rows.slice(0, COLLAPSIBLE_ROW_LIMIT);
  const canCollapse = rows.length > COLLAPSIBLE_ROW_LIMIT;

  return (
    <DashboardSection>
      <DashboardSection.Header icon={icon} title={title} />
      <DashboardSection.Body>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => `event-sk-${title}-${i}`).map((k) => (
              <div key={k} className="h-8 bg-[var(--ds-bg-elevated)] rounded animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--ds-text-subtle)] py-4 text-center">
            {analyticsMessages.noData}
          </p>
        ) : (
          <CollapsibleList
            canCollapse={canCollapse}
            collapsedContent={<EventRowList rows={collapsedRows} max={max} keyPrefix={title} formatNumber={formatNumber} />}
            expandedContent={<EventRowList rows={rows} max={max} keyPrefix={title} formatNumber={formatNumber} />}
          />
        )}
      </DashboardSection.Body>
    </DashboardSection>
  );
}
