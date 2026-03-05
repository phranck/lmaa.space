import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import type { DashboardLocale } from "@/i18n/messages.ts";

const LANGUAGE_OPTIONS = [
  { value: "de" as const, label: "DE" },
  { value: "en" as const, label: "EN" },
];

/**
 * Locale switcher (DE/EN) using SegmentedControl.
 *
 * Persistence is handled by `I18nContext` (key `"dashboard-locale"`), so no
 * `storageKey` is passed to `SegmentedControl` to avoid conflicting writes.
 *
 * @returns Language toggle control.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <SegmentedControl<DashboardLocale>
      value={locale}
      onChange={setLocale}
      options={LANGUAGE_OPTIONS}
    />
  );
}
