/**
 * Loading skeleton for Markdown content pages
 * Matches expected content layout to reduce layout shift
 */
export function MarkdownLoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Title skeleton */}
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded mb-8 animate-pulse w-2/3" />

        {/* Content paragraph skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 mb-6">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6 animate-pulse" />
          </div>
        ))}

        {/* Second section */}
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded mt-8 mb-6 animate-pulse w-1/2" />
        {[1, 2].map((i) => (
          <div key={`sec2-${i}`} className="space-y-2 mb-6">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
