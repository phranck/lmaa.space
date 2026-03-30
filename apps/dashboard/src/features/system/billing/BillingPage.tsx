import { ChartLineUpIcon, ListBulletsIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ApiRequestError, BillingServiceCost } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui";

import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import type { ColumnDef } from "@/components/ui/Table.tsx";
import { DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import {
  SERVICE_PERIODS,
  type ServicePeriod,
  filterTimelineByPeriod,
  formatEur,
  getServiceCost,
} from "./billing-utils.ts";
import { useBillingCosts, useBillingStatus, useBillingTimeline } from "./useBillingData.ts";

function CostCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 text-center shadow-sm">
      <p className="text-sm text-[var(--ds-text-muted)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--ds-text)]">{formatEur(value)}</p>
    </div>
  );
}

function ErrorBox({ title, error }: { title: string; error: unknown }) {
  const apiError = error as ApiRequestError | undefined;
  const status = apiError?.status;
  const message = apiError?.responseMessage ?? apiError?.message ?? "Unknown error";

  return (
    <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-5">
      <p className="font-medium text-red-700 dark:text-red-400">{title}</p>
      <p className="mt-1 text-sm text-red-600 dark:text-red-300">{message}</p>
      {status && <p className="mt-1 text-xs text-red-500 dark:text-red-400">HTTP {status}</p>}
    </div>
  );
}

export function BillingPage() {
  const { messages, locale } = useI18n();
  const t = messages.content.billing;
  const [period, setPeriod] = useState<ServicePeriod>("thisMonth");

  const costFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2 }),
    [locale],
  );

  const formatDateTick = (isoDate: string) => {
    const [, month, day] = isoDate.split("-");
    return locale === "de" ? `${day}.${month}.` : `${month}-${day}`;
  };

  const formatCostTick = (value: number) => costFormatter.format(value);

  const periodLabels: Record<ServicePeriod, string> = useMemo(
    () => ({
      today: t.today,
      yesterday: t.yesterday,
      thisWeek: t.thisWeek,
      last7days: t.last7days,
      thisMonth: t.thisMonth,
      lastMonth: t.lastMonth,
      last30days: t.last30days,
      total: t.total,
    }),
    [t],
  );

  const periodDropdown = (
    <select
      value={period}
      onChange={(e) => setPeriod(e.target.value as ServicePeriod)}
      className="px-2 py-1 text-xs rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
    >
      {SERVICE_PERIODS.map((key) => (
        <option key={key} value={key}>{periodLabels[key]}</option>
      ))}
    </select>
  );

  const serviceColumns = useMemo<ColumnDef<BillingServiceCost>[]>(
    () => [
      {
        id: "name",
        header: "Service",
        sortKey: (svc) => svc.name,
        cell: (svc) => <span className="font-medium">{svc.name}</span>,
      },
      {
        id: "cost",
        header: periodLabels[period],
        headerClassName: "text-right",
        cellClassName: "text-right",
        sortKey: (svc) => getServiceCost(svc, period),
        cell: (svc) => formatEur(getServiceCost(svc, period)),
      },
    ],
    [period, periodLabels],
  );

  const { data: costs, isLoading: costsLoading, error: costsError } = useBillingCosts();
  const { data: timeline, isLoading: timelineLoading, error: timelineError } = useBillingTimeline(30);
  const { data: status, error: statusError } = useBillingStatus();

  const chartData = useMemo(
    () => filterTimelineByPeriod(timeline?.items ?? [], period),
    [timeline, period],
  );
  const maxCost = Math.max(...chartData.map((d) => d.cost), 0.1);

  const isLoading = costsLoading || timelineLoading;

  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader title={t.title} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((key) => (
            <div
              key={key}
              className="h-24 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] animate-pulse"
            />
          ))}
        </div>
        <div className="mt-6 h-48 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] animate-pulse" />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader title={t.title} />

      {/* Errors */}
      {costsError && <ErrorBox title={t.costLabel} error={costsError} />}
      {timelineError && <ErrorBox title={t.costTimeline} error={timelineError} />}
      {statusError && <ErrorBox title={t.credit} error={statusError} />}

      {/* Cost summary cards */}
      {costs && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <CostCard label={t.today} value={costs.today} />
          <CostCard label={t.thisMonth} value={costs.thisMonth} />
          <CostCard label={t.lastMonth} value={costs.lastMonth} />
          <CostCard label={t.averagePerDay} value={costs.averageLast30Days} />
          {status && <CostCard label={t.credit} value={status.credit} />}
        </div>
      )}

      {/* Period filter */}
      <div className="mt-6 flex justify-end">{periodDropdown}</div>

      {/* Cost timeline chart */}
      <DashboardSection className="mt-3">
        <DashboardSection.Header
          icon={<ChartLineUpIcon weight="duotone" className="w-4 h-4" />}
          title={`${t.costTimeline}: ${periodLabels[period]}`}
        />
        <DashboardSection.Body>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-[var(--ds-text-muted)]">
              {t.noData}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border-subtle)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--ds-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatDateTick}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--ds-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={true}
                  domain={[0, Math.ceil(maxCost * 1.1 * 100) / 100]}
                  tickFormatter={formatCostTick}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--ds-border)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    background: "var(--ds-surface)",
                    color: "var(--ds-text)",
                  }}
                  formatter={(value: number) => [costFormatter.format(value), t.costLabel]}
                  labelFormatter={formatDateTick}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradCost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </DashboardSection.Body>
      </DashboardSection>

      {/* Service breakdown */}
      {costs?.services && costs.services.length > 0 && (
        <DashboardSection className="mt-3">
          <DashboardSection.Header
            icon={<ListBulletsIcon weight="duotone" className="w-4 h-4" />}
            title={t.serviceBreakdown}
          />
          <DashboardSection.Body>
            <div className="-mx-3 -mt-3">
              <DataTable
                columns={serviceColumns}
                data={costs.services}
                getRowKey={(svc) => svc.name}
                initialSort={{ id: "cost", dir: "desc" }}
              />
            </div>
          </DashboardSection.Body>
        </DashboardSection>
      )}
    </PageLayout>
  );
}
