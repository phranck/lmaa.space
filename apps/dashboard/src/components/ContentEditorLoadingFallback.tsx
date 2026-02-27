/**
 * Loading spinner for MDXEditor
 * Shown while the editor bundle is being loaded
 */
/**
 * Placeholder UI shown while content editor bundle/data loads.
 *
 * @returns Static skeleton approximating the editor surface.
 */
export function ContentEditorLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">
          Inhaltseditor wird geladen...
        </p>
      </div>
    </div>
  );
}
