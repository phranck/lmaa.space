/**
 * Loading skeleton for Analytics section
 * Matches the 2x2 grid layout of charts
 */
const ANALYTICS_SKELETON_KEYS = [
  "analytics-sk-1",
  "analytics-sk-2",
  "analytics-sk-3",
  "analytics-sk-4",
];

/**
 * Skeleton placeholder displayed while analytics data is loading.
 *
 * @returns Card/grid shimmer layout matching final analytics panel.
 */
export function AnalyticsLoadingFallback() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {ANALYTICS_SKELETON_KEYS.map((key) => (
        <div key={key} className="bg-slate-100 dark:bg-slate-800 rounded-lg h-64 animate-pulse" />
      ))}
    </div>
  );
}
