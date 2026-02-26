import {
  DASHBOARD_MESSAGES,
  type DashboardLocale,
  type DashboardMessages,
} from "@/i18n/messages.ts";
import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

const DASHBOARD_LOCALE_STORAGE_KEY = "dashboard-locale";

interface I18nContextValue {
  locale: DashboardLocale;
  setLocale: (locale: DashboardLocale) => void;
  messages: DashboardMessages;
  formatNumber: (value: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function resolveInitialLocale(): DashboardLocale {
  try {
    const stored = localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {}

  try {
    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith("en")) return "en";
  } catch {}

  return "de";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localeState, setLocaleState] = useState<DashboardLocale>(resolveInitialLocale);

  const value = useMemo<I18nContextValue>(() => {
    const messages = DASHBOARD_MESSAGES[localeState];
    const numberFormatter = new Intl.NumberFormat(localeState);

    return {
      locale: localeState,
      setLocale: (next) => {
        setLocaleState(next);
        try {
          localStorage.setItem(DASHBOARD_LOCALE_STORAGE_KEY, next);
        } catch {}
      },
      messages,
      formatNumber: (value) => numberFormatter.format(value),
    };
  }, [localeState]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
