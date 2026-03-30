import type { BillingServiceCost, BillingTimelineItem } from "@lmaa/shared";

export type ServicePeriod =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "last7days"
  | "thisMonth"
  | "lastMonth"
  | "last30days"
  | "total";

export const SERVICE_PERIODS: ServicePeriod[] = [
  "today",
  "yesterday",
  "thisWeek",
  "last7days",
  "thisMonth",
  "lastMonth",
  "last30days",
  "total",
];

const periodAccessors: Record<ServicePeriod, (svc: BillingServiceCost) => number> = {
  today: (svc) => svc.today,
  yesterday: (svc) => svc.yesterday,
  thisWeek: (svc) => svc.thisWeek,
  last7days: (svc) => svc.last7days,
  thisMonth: (svc) => svc.thisMonth,
  lastMonth: (svc) => svc.lastMonth,
  last30days: (svc) => svc.last30days,
  total: (svc) => svc.total,
};

export function getServiceCost(svc: BillingServiceCost, period: ServicePeriod): number {
  return periodAccessors[period](svc);
}

export function formatEur(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeCutoffDate(period: ServicePeriod): string {
  const now = new Date();
  const todayStr = fmtDate(now);

  switch (period) {
    case "today":
      return todayStr;
    case "yesterday":
      return fmtDate(new Date(now.getTime() - 86400000));
    case "thisWeek": {
      const d = new Date(now);
      d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
      return fmtDate(d);
    }
    case "last7days":
      return fmtDate(new Date(now.getTime() - 7 * 86400000));
    case "thisMonth":
      return `${todayStr.slice(0, 7)}-01`;
    case "lastMonth":
      return fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    case "last30days":
      return fmtDate(new Date(now.getTime() - 30 * 86400000));
    case "total":
      return "2000-01-01";
  }
}

export interface ChartDataPoint {
  date: string;
  cost: number;
}

export function filterTimelineByPeriod(
  items: BillingTimelineItem[],
  period: ServicePeriod,
): ChartDataPoint[] {
  const cutoff = computeCutoffDate(period);
  return items
    .filter((item) => item.date >= cutoff)
    .map((item) => ({ date: item.date, cost: Number(item.cost.toFixed(2)) }));
}
