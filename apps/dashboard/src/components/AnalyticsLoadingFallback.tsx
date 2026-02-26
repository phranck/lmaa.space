/**
 * Loading skeleton for Analytics section
 * Matches the 2x2 grid layout of charts
 */
export function AnalyticsLoadingFallback() {
  const skeletonKeys = ["analytics-sk-1", "analytics-sk-2", "analytics-sk-3", "analytics-sk-4"];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {skeletonKeys.map((key) => (
        <div key={key} className="bg-slate-100 dark:bg-slate-800 rounded-lg h-64 animate-pulse" />
      ))}
    </div>
  );
}
