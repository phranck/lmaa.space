import { formatTrendValue } from "@/features/analytics/analytics-utils.ts";

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: number | null;
  invertTrendColor?: boolean;
  sub?: string;
}

export function KpiCard({ label, value, trend, invertTrendColor = false, sub }: KpiCardProps) {
  const hasTrend = typeof trend === "number" && Number.isFinite(trend);
  const trendArrow = !hasTrend ? "→" : trend >= 0 ? "↑" : "↓";
  const trendText = !hasTrend ? "—" : formatTrendValue(trend);
  const trendIsGood = hasTrend && (invertTrendColor ? trend < 0 : trend >= 0);
  const trendTone = !hasTrend
    ? "bg-[var(--ds-bg-elevated)] text-[var(--ds-text-subtle)]"
    : trendIsGood
      ? "bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]"
      : "bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]";

  return (
    <div
      className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm px-4 py-3 min-w-0"
      style={{ containerType: "inline-size" }}
    >
      <p className="text-sm text-[var(--ds-text-subtle)] mb-1 truncate">{label}</p>
      <div className="kpi-layout">
        <p className="text-2xl font-semibold text-[var(--ds-text)] whitespace-nowrap min-w-0 kpi-value">
          {value}
        </p>
        <p
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-semibold tabular-nums shrink-0 ${trendTone}`}
        >
          <span aria-hidden="true">{trendArrow}</span>
          <span>{trendText}</span>
        </p>
      </div>
      {sub && <p className="text-sm text-[var(--ds-text-subtle)] mt-0.5">{sub}</p>}
    </div>
  );
}
