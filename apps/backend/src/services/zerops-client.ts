import type {
  BillingCostSummary,
  BillingServiceCost,
  BillingStatus,
  BillingTimeline,
} from "@lmaa/shared";

import { logger } from "../lib/logger.js";

const ZEROPS_API_BASE = "https://api.app-prg1.zerops.io/api/rest/public";
const REQUEST_TIMEOUT_MS = 15_000;

/** Period cost object returned by the Zerops cost-search endpoint. */
interface ZeropsPeriodCost {
  today?: number;
  yesterday?: number;
  last24hours?: number;
  last7days?: number;
  last30days?: number;
  thisMonth?: number;
  lastMonth?: number;
  thisYear?: number;
  lastYear?: number;
  averageLast30Days?: number;
}

interface ZeropsCostItem {
  id: string;
  name?: string;
  periodCost: ZeropsPeriodCost;
}

interface ZeropsCostSearchResponse {
  client: ZeropsCostItem;
  project: ZeropsCostItem[];
  stack: ZeropsCostItem[];
}

interface ZeropsGroupByItem {
  projectId: string;
  projectName: string;
  stackId: string;
  stackName: string;
  from: string;
  till: string;
  sumTotalPrice: number;
}

interface ZeropsGroupByResponse {
  items: ZeropsGroupByItem[];
}

interface ZeropsBillingStatusResponse {
  credit: number;
  promoCredit: number;
}

interface ZeropsApiError {
  error?: { code?: string; message?: string };
}

export class ZeropsApiRequestError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "ZeropsApiRequestError";
  }
}

async function parseZeropsError(res: Response): Promise<ZeropsApiRequestError> {
  let code = "zerops_unknown";
  let message = `Zerops API returned HTTP ${res.status}`;
  try {
    const body = (await res.json()) as ZeropsApiError;
    if (body.error?.code) code = `zerops_${body.error.code}`;
    if (body.error?.message) message = body.error.message;
  } catch {
    // body not parsable, use defaults
  }
  return new ZeropsApiRequestError(res.status, code, message);
}

/**
 * Zerops Billing API client.
 * Docs: https://openapi.zerops.io/
 */
export class ZeropsClient {
  constructor(
    private apiToken: string,
    private clientId?: string,
    private projectId?: string,
  ) {}

  private buildSearch(...extraFilters: string[]): Array<{ name: string; operator: string; value: string }> {
    const filters: Array<{ name: string; operator: string; value: string }> = [];
    if (this.clientId) filters.push({ name: "clientId", operator: "eq", value: this.clientId });
    if (this.projectId && extraFilters.includes("projectId")) {
      filters.push({ name: "projectId", operator: "eq", value: this.projectId });
    }
    return filters;
  }

  async fetchCostSummary(): Promise<BillingCostSummary> {
    // cost-search only supports clientId filter (no projectId).
    // If a projectId is set, we use group-by-search for project-scoped totals instead.
    if (this.projectId) {
      return this.fetchProjectCostSummary();
    }

    const [costRes, stackNames] = await Promise.all([
      this.post("/transaction-debit/cost-search", { search: this.buildSearch() }),
      this.fetchStackNameMap(),
    ]);
    if (!costRes.ok) {
      const err = await parseZeropsError(costRes);
      logger.warn({ status: costRes.status, code: err.errorCode }, "Zerops: cost-search failed");
      throw err;
    }
    const data = (await costRes.json()) as ZeropsCostSearchResponse;
    return mapCostSummary(data, stackNames);
  }

  /** Fetches active service stack IDs for the project. */
  private async fetchProjectStackIds(): Promise<Set<string>> {
    const ids = new Set<string>();
    if (!this.projectId) return ids;
    try {
      const search = this.buildSearch("projectId");
      const res = await this.post("/service-stack/search", { search });
      if (res.ok) {
        const data = (await res.json()) as { items: Array<{ id: string; status: string }> };
        for (const item of data.items) {
          if (item.status === "ACTIVE") ids.add(item.id);
        }
      }
    } catch {
      // Non-critical
    }
    return ids;
  }

  /** Project-scoped cost summary built from group-by-search (supports projectId filter). */
  private async fetchProjectCostSummary(): Promise<BillingCostSummary> {
    const now = new Date();
    // Fetch last 60 days of daily data and active stack IDs in parallel
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [res, activeStackIds] = await Promise.all([
      this.post("/transaction-debit/group-by-search", {
        search: this.buildSearch("projectId"),
        from: sixtyDaysAgo.toISOString(),
        till: now.toISOString(),
        timeZone: "Europe/Berlin",
        groupBy: "stackId",
        timeGroupBy: "1d",
      }),
      this.fetchProjectStackIds(),
    ]);
    if (!res.ok) {
      const err = await parseZeropsError(res);
      logger.warn({ status: res.status, code: err.errorCode }, "Zerops: project cost-summary failed");
      throw err;
    }
    const data = (await res.json()) as ZeropsGroupByResponse;

    // Date boundaries using Berlin time (matches API timeZone parameter)
    const berlinDate = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const todayStr = fmtDate(berlinDate);
    const thisMonthPrefix = todayStr.slice(0, 7);
    const prevMonth = berlinDate.getMonth() === 0 ? 12 : berlinDate.getMonth();
    const prevMonthYear = berlinDate.getMonth() === 0 ? berlinDate.getFullYear() - 1 : berlinDate.getFullYear();
    const lastMonthPrefix = `${prevMonthYear}-${pad(prevMonth)}`;

    const yesterday = new Date(berlinDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = fmtDate(yesterday);

    // Monday of the current week (ISO: Monday = 1)
    const dayOfWeek = berlinDate.getDay() || 7; // Sunday=0 -> 7
    const monday = new Date(berlinDate);
    monday.setDate(monday.getDate() - (dayOfWeek - 1));
    const thisWeekStr = fmtDate(monday);

    const sevenDaysAgo = new Date(berlinDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = fmtDate(sevenDaysAgo);

    const thirtyDaysAgo = new Date(berlinDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = fmtDate(thirtyDaysAgo);

    let today = 0;
    let thisMonth = 0;
    let lastMonth = 0;
    let last30days = 0;

    const emptyService = (name: string): BillingServiceCost => ({
      name, today: 0, yesterday: 0, thisWeek: 0, last7days: 0,
      thisMonth: 0, lastMonth: 0, last30days: 0, total: 0,
    });

    const serviceMap = new Map<string, BillingServiceCost>();

    for (const item of data.items) {
      const date = item.from.slice(0, 10);
      const month = date.slice(0, 7);
      const price = item.sumTotalPrice;
      const stackId = item.stackId;

      if (!item.stackName) continue;
      if (activeStackIds.size > 0 && !activeStackIds.has(stackId)) continue;

      if (!serviceMap.has(stackId)) serviceMap.set(stackId, emptyService(item.stackName));
      const svc = serviceMap.get(stackId)!;

      svc.total += price;
      if (date === todayStr) { today += price; svc.today += price; }
      if (date === yesterdayStr) svc.yesterday += price;
      if (date >= thisWeekStr) svc.thisWeek += price;
      if (date >= sevenDaysAgoStr) svc.last7days += price;
      if (month === thisMonthPrefix) { thisMonth += price; svc.thisMonth += price; }
      if (month === lastMonthPrefix) { lastMonth += price; svc.lastMonth += price; }
      if (date >= thirtyDaysAgoStr) { last30days += price; svc.last30days += price; }
    }

    const averageLast30Days = last30days / 30;
    const services = [...serviceMap.values()]
      .filter((s) => s.total > 0)
      .sort((a, b) => b.thisMonth - a.thisMonth);

    return { today, thisMonth, lastMonth, last30days, averageLast30Days, services };
  }

  /** Resolves stack IDs to human-readable names via a short group-by-search. */
  private async fetchStackNameMap(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const res = await this.post("/transaction-debit/group-by-search", {
        search: this.buildSearch("projectId"),
        from: yesterday.toISOString(),
        till: now.toISOString(),
        timeZone: "Europe/Berlin",
        groupBy: "stackId",
        timeGroupBy: "1d",
      });
      if (res.ok) {
        const data = (await res.json()) as ZeropsGroupByResponse;
        for (const item of data.items) {
          if (item.stackName && !map.has(item.stackId)) {
            map.set(item.stackId, item.stackName);
          }
        }
      }
    } catch {
      // Non-critical -- fall back to IDs
    }
    return map;
  }

  async fetchCostTimeline(days: number): Promise<BillingTimeline> {
    const till = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const res = await this.post("/transaction-debit/group-by-search", {
      search: this.buildSearch("projectId"),
      from: from.toISOString(),
      till: till.toISOString(),
      timeZone: "Europe/Berlin",
      groupBy: "projectId",
      timeGroupBy: "1d",
    });
    if (!res.ok) {
      const err = await parseZeropsError(res);
      logger.warn({ status: res.status, code: err.errorCode }, "Zerops: group-by-search failed");
      throw err;
    }
    const data = (await res.json()) as ZeropsGroupByResponse;
    return mapTimeline(data);
  }

  async fetchBillingStatus(): Promise<BillingStatus | null> {
    if (!this.clientId) return null;
    const res = await this.fetch(`/billing/client/${this.clientId}/status`);
    if (!res.ok) {
      const err = await parseZeropsError(res);
      logger.warn({ status: res.status, code: err.errorCode }, "Zerops: billing status failed");
      throw err;
    }
    const data = (await res.json()) as ZeropsBillingStatusResponse;
    return { credit: data.credit, promoCredit: data.promoCredit };
  }

  private fetch(path: string): Promise<Response> {
    return fetch(`${ZEROPS_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.apiToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  private post(path: string, body: unknown): Promise<Response> {
    return fetch(`${ZEROPS_API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
}

function mapCostSummary(data: ZeropsCostSearchResponse, stackNames: Map<string, string>): BillingCostSummary {
  const c = data.client.periodCost;
  const services: BillingServiceCost[] = data.stack.map((s) => ({
    name: stackNames.get(s.id) ?? s.name ?? s.id,
    today: s.periodCost.today ?? 0,
    yesterday: s.periodCost.yesterday ?? 0,
    thisWeek: 0,
    last7days: s.periodCost.last7days ?? 0,
    thisMonth: s.periodCost.thisMonth ?? 0,
    lastMonth: s.periodCost.lastMonth ?? 0,
    last30days: s.periodCost.last30days ?? 0,
    total: s.periodCost.thisYear ?? 0,
  }));

  return {
    today: c.today ?? 0,
    thisMonth: c.thisMonth ?? 0,
    lastMonth: c.lastMonth ?? 0,
    last30days: c.last30days ?? 0,
    averageLast30Days: c.averageLast30Days ?? 0,
    services,
  };
}

function mapTimeline(data: ZeropsGroupByResponse): BillingTimeline {
  const byDate = new Map<string, number>();
  for (const item of data.items) {
    const date = item.from.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + item.sumTotalPrice);
  }

  const items = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost }));

  return { items };
}
