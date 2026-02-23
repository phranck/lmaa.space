/**
 * Loading skeleton for Analytics section
 * Matches the 2x2 grid layout of charts
 */
export function AnalyticsLoadingFallback() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-slate-100 dark:bg-slate-800 rounded-lg h-64 animate-pulse"
        />
      ))}
    </div>
  );
}
