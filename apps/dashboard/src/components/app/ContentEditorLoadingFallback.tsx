import { useI18n } from "@/context/I18nContext.tsx";

/**
 * Placeholder UI shown while content editor bundle/data loads.
 *
 * @returns Static skeleton approximating the editor surface.
 */
export function ContentEditorLoadingFallback() {
  const { messages } = useI18n();
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-medium">
          {messages.content.loadingFallback}
        </p>
      </div>
    </div>
  );
}
