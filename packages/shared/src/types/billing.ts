/**
 * Aggregated cost summary from Zerops billing API.
 */
export interface BillingCostSummary {
  today: number;
  thisMonth: number;
  lastMonth: number;
  last30days: number;
  averageLast30Days: number;
  services: BillingServiceCost[];
}

/**
 * Per-service cost breakdown.
 */
export interface BillingServiceCost {
  name: string;
  today: number;
  yesterday: number;
  thisWeek: number;
  last7days: number;
  thisMonth: number;
  lastMonth: number;
  last30days: number;
  total: number;
}

/**
 * Timeline data point for cost chart.
 */
export interface BillingTimelineItem {
  date: string;
  cost: number;
}

/**
 * Timeline response for cost chart.
 */
export interface BillingTimeline {
  items: BillingTimelineItem[];
}

/**
 * Billing account status (credit/balance).
 */
export interface BillingStatus {
  credit: number;
  promoCredit: number;
}

/**
 * Compact public billing summary for the website.
 */
export interface BillingPublicSummary {
  today: number;
  thisMonth: number;
}
